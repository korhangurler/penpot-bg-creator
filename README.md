# Penpot BG Creator

Bu klasör doğrudan GitHub Pages'te yayınlanmak için hazırdır.

## Kurulum

ZIP içindeki dosyaları `penpot-bg-creator` reposunun köküne kopyala:

```bash
git add .
git commit -m "Install working Penpot plugin"
git push
```

GitHub → Repository → Settings → Pages:

- Source: Deploy from a branch
- Branch: main
- Folder: /(root)

Manifest adresi:

```text
https://korhangurler.github.io/penpot-bg-creator/manifest.json
```

Penpot'ta eski eklentiyi kaldırıp bu manifest URL'siyle yeniden kur.

## Önemli

`plugin.js` içinde sabit IP/domain yoktur. `penpot.ui.open()` query-only URL kullanır ve UI aynı GitHub Pages dizinindeki `index.html` üzerinden açılır.

SVG'ler `assets/shapes/` içinden yüklenir.
