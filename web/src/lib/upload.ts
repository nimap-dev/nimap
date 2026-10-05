export function disposition(name: string) {
  const encoded = encodeURIComponent(name).replace(
    /['()*!]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )

  return `attachment; filename*=UTF-8''${encoded}`
}
