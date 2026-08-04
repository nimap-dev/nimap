package main

import (
	"fmt"

	"github.com/danielgtaylor/huma/v2/humacli"
	"github.com/go-chi/chi/v5"
	"github.com/spf13/cobra"

	"github.com/nimap-dev/nimap/internal/config"
	"github.com/nimap-dev/nimap/internal/httpapi"
)

// registerOpenAPICommand adds `nimap openapi`, which prints the OpenAPI 3.1
// document to stdout.
func registerOpenAPICommand(cli humacli.CLI) {
	cli.Root().AddCommand(&cobra.Command{
		Use:   "openapi",
		Short: "Print the OpenAPI 3.1 specification to stdout",
		Run: func(_ *cobra.Command, _ []string) {
			api := httpapi.NewAPI(chi.NewMux(), config.Version, nil, nil)
			spec, err := api.OpenAPI().YAML()
			if err != nil {
				fatal("could not render OpenAPI spec", err)
			}
			fmt.Println(string(spec))
		},
	})
}
