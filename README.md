# 智能商品图生成器

商品抠图使用 IMG.LY 的 `@imgly/background-removal` 浏览器端模型，图片仅在本机浏览器中处理。该依赖遵循其项目许可证，来源：https://github.com/imgly/background-removal-js

上传商品截图，分别框选商品图与商品名称，自动识别文字、增强商品图，并导出白底 800×800、低于 400 KB 的 JPG。

## GitHub Pages

推送到 `main` 后，GitHub Actions 会发布 `dist/`：

https://maxineccc.github.io/smart-product-image-studio/
