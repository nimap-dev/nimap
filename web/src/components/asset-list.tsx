import {
  getGetAssetContentUrl,
  getListAssetsQueryKey,
  uploadAsset,
  useDeleteAssetAttachment,
  useListAssets,
} from '#/api/assets/assets'
import type { AssetAttachmentResponse, ListAssetsParams } from '#/api/model'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { toast } from '#/components/ui/toast'
import { useCan } from '#/lib/auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileIcon,
  FileTextIcon,
  Trash2,
  Upload,
  VideoIcon,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type AssetType = AssetAttachmentResponse['asset']['type']

export function AssetList({
  resourceType,
  resourceId,
}: {
  resourceType: ListAssetsParams['resourceType']
  resourceId: string
}) {
  const canWrite = useCan('records:write')
  const queryClient = useQueryClient()
  const picker = useRef<HTMLInputElement>(null)
  const [removing, setRemoving] = useState<AssetAttachmentResponse>()
  const [viewing, setViewing] = useState<number>()

  const params = { resourceType, resourceId }
  const { data } = useListAssets(params)
  const attachments = data?.status === 200 ? data.data : []

  const upload = useMutation({
    mutationFn: (file: File) =>
      uploadAsset(file, params, {
        headers: { 'Content-Disposition': disposition(file.name) },
      }),
  })

  const remove = useDeleteAssetAttachment()

  async function handleUpload(files: File[]) {
    for (const file of files) {
      try {
        const res = await upload.mutateAsync(file)

        if (res.status !== 201) {
          toast.add({
            type: 'error',
            title: `Could not upload ${file.name}`,
            description: res.data.detail ?? 'The file was not stored',
          })
          continue
        }
      } catch {
        toast.add({
          type: 'error',
          title: `Could not upload ${file.name}`,
          description: 'The request failed, check your connection and retry',
        })
      }
    }

    await queryClient.invalidateQueries({
      queryKey: getListAssetsQueryKey(params),
    })
  }

  async function handleRemove() {
    if (!removing) {
      return
    }

    const name = removing.asset.title

    try {
      const res = await remove.mutateAsync({ id: removing.id })

      if (res.status !== 204) {
        toast.add({
          type: 'error',
          title: 'Could not remove',
          description: res.data.detail ?? `${name} is still there`,
        })
        return
      }
    } catch {
      toast.add({
        type: 'error',
        title: 'Could not remove',
        description: 'The request failed, check your connection and retry',
      })
      return
    }

    setRemoving(undefined)
    await queryClient.invalidateQueries({
      queryKey: getListAssetsQueryKey(params),
    })
    toast.add({ type: 'success', description: `${name} was removed` })
  }

  return (
    <AlertDialog
      open={removing !== undefined}
      onOpenChange={(open) => !open && setRemoving(undefined)}
    >
      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Files</h3>
          {canWrite && (
            <>
              <input
                ref={picker}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  const picked = Array.from(event.target.files ?? [])
                  event.target.value = ''

                  if (picked.length > 0) {
                    handleUpload(picked)
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={upload.isPending}
                onClick={() => picker.current?.click()}
              >
                <Upload />
                {upload.isPending ? 'Uploading…' : 'Add files'}
              </Button>
            </>
          )}
        </div>

        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files yet.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {attachments.map((attachment, index) => (
              <li key={attachment.id} className="group relative">
                <button
                  type="button"
                  title={attachment.asset.originalFilename}
                  onClick={() => setViewing(index)}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-md border bg-muted/30 p-2 hover:bg-muted"
                >
                  <AssetThumbnail attachment={attachment} />
                </button>
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${attachment.asset.title}`}
                    onClick={() => setRemoving(attachment)}
                    className="absolute top-1 right-1 bg-background/80 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <AssetViewer
        attachments={attachments}
        index={viewing}
        onIndex={setViewing}
        onRemove={
          canWrite
            ? (attachment) => {
                setViewing(undefined)
                setRemoving(attachment)
              }
            : undefined
        }
      />

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Remove this file?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="mb-2 block line-clamp-2 font-medium break-all text-foreground">
              {removing?.asset.title}
            </span>
            The file is deleted, not just detached, unless something else still
            points at it. You can't undo this from here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" disabled={remove.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={handleRemove}
          >
            {remove.isPending ? 'Removing…' : 'Remove file'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function AssetViewer({
  attachments,
  index,
  onIndex,
  onRemove,
}: {
  attachments: AssetAttachmentResponse[]
  index: number | undefined
  onIndex: (index: number | undefined) => void
  onRemove?: (attachment: AssetAttachmentResponse) => void
}) {
  useEffect(() => {
    if (index === undefined || attachments.length === 0) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest('video, audio, input, textarea, [contenteditable]')
      ) {
        return
      }

      if (event.key === 'ArrowLeft') {
        onIndex((index! - 1 + attachments.length) % attachments.length)
      }
      if (event.key === 'ArrowRight') {
        onIndex((index! + 1) % attachments.length)
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [index, attachments.length, onIndex])

  const current = index === undefined ? undefined : attachments[index]
  if (current === undefined || index === undefined) {
    return null
  }

  const url = getGetAssetContentUrl(current.asset.id)

  return (
    <Dialog open onOpenChange={(next) => !next && onIndex(undefined)}>
      <DialogContent
        showCloseButton={false}
        className="inset-4 flex w-auto max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <DialogHeader className="h-12 shrink-0 flex-row items-center gap-1 border-b px-2">
          <DialogTitle className="min-w-0 flex-1 truncate text-sm font-medium">
            {current.asset.title}
          </DialogTitle>
          <span className="shrink-0 px-2 text-xs text-muted-foreground">
            {index + 1} / {attachments.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Download"
            nativeButton={false}
            render={<a href={url} download={current.asset.originalFilename} />}
          >
            <Download />
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove file"
              onClick={() => onRemove(current)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          )}
          <DialogClose
            aria-label="Close"
            render={<Button variant="ghost" size="icon" />}
          >
            <X />
          </DialogClose>
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-4">
          <AssetPreview attachment={current} url={url} />

          {attachments.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous file"
                onClick={() =>
                  onIndex((index - 1 + attachments.length) % attachments.length)
                }
                className="absolute left-2 rounded-full"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next file"
                onClick={() => onIndex((index + 1) % attachments.length)}
                className="absolute right-2 rounded-full"
              >
                <ChevronRight />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AssetPreview({
  attachment,
  url,
}: {
  attachment: AssetAttachmentResponse
  url: string
}) {
  const { asset } = attachment

  if (asset.type === 'image') {
    return (
      <img
        src={url}
        alt={asset.title}
        className="max-h-full max-w-full object-contain"
      />
    )
  }

  if (asset.type === 'video') {
    return <video src={url} controls className="max-h-full max-w-full" />
  }

  if (asset.contentType === 'application/pdf') {
    return (
      <iframe
        src={url}
        title={asset.title}
        className="h-full w-full rounded border bg-background"
      />
    )
  }

  return (
    <div className="grid justify-items-center gap-3 text-center">
      <AssetTypeIcon
        type={asset.type}
        className="size-10 text-muted-foreground"
      />
      <p className="max-w-xs truncate text-sm">{asset.originalFilename}</p>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<a href={url} target="_blank" rel="noreferrer" />}
      >
        Open in a new tab
      </Button>
    </div>
  )
}

function AssetThumbnail({
  attachment,
}: {
  attachment: AssetAttachmentResponse
}) {
  const { asset } = attachment
  const [broken, setBroken] = useState(false)

  if (asset.type === 'image' && !broken) {
    return (
      <img
        src={getGetAssetContentUrl(asset.id)}
        alt={asset.title}
        onError={() => setBroken(true)}
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <>
      <AssetTypeIcon
        type={asset.type}
        className="size-6 text-muted-foreground"
      />
      <span className="w-full truncate text-center text-xs">{asset.title}</span>
    </>
  )
}

function AssetTypeIcon({
  type,
  className,
}: {
  type: AssetType
  className?: string
}) {
  const Icon =
    type === 'video' ? VideoIcon : type === 'document' ? FileTextIcon : FileIcon

  return <Icon className={className} />
}

function disposition(name: string) {
  const encoded = encodeURIComponent(name).replace(
    /['()*!]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )

  return `attachment; filename*=UTF-8''${encoded}`
}
