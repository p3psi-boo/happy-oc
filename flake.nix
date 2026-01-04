{
  description = "happy frontend dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };

        packages = with pkgs; [
          nodejs_20
          yarn

          git
          curl

          python3
          gnumake
          gcc
          pkg-config

          watchman
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          packages = packages;

          shellHook = ''
            echo "Nix dev shell ready (frontend)."
            echo "- Install: yarn install"
            echo "- Dev: yarn start"
            echo "- Web: yarn web"
            echo "- Typecheck: yarn typecheck"
          '';
        };
      }
    );
}
