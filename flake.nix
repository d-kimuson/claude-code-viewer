{
  description = "Claude Code Viewer development shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forEachSystem (system:
        let
          pkgs = import nixpkgs { inherit system; };
          lib = pkgs.lib;
          pkgConfigDeps = with pkgs; [
            glib.dev
            atk.dev
            cairo.dev
            gdk-pixbuf.dev
            gtk3.dev
            harfbuzz.dev
            fribidi.dev
            freetype.dev
            fontconfig.dev
            graphite2.dev
            pango.dev
            libsoup_3.dev
            webkitgtk_4_1.dev
          ];
          pkgConfigPath =
            (lib.makeSearchPath "lib/pkgconfig" pkgConfigDeps)
            + ":" + (lib.makeSearchPath "share/pkgconfig" pkgConfigDeps);
          runtimeDeps = with pkgs; [
              glib
              atk
              cairo
              gdk-pixbuf
              gtk3
              harfbuzz
              fribidi
              freetype
              fontconfig
              graphite2
              pango
              libsoup_3
              webkitgtk_4_1
            ];
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              pkg-config
            ] ++ runtimeDeps ++ pkgConfigDeps;

            shellHook = ''
              export PKG_CONFIG_PATH="${pkgConfigPath}"
              export LD_LIBRARY_PATH="${lib.makeLibraryPath runtimeDeps}''${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
            '';
          };
        });
    };
}
