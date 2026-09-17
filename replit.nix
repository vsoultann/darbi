{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    # better-sqlite3 falls back to a source build when no prebuilt binary matches.
    pkgs.python3
    pkgs.gcc
    pkgs.gnumake
  ];
}
