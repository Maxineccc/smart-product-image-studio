# 智能商品图生成器

当前版本 v2.2.0：全部模板统一使用用户提供的淘宝闪购透明 Logo，并扩展为 3 套 800×800 方形模板和 3 套 1280×720 横版模板。同一张商品主体只需上传一次，即可逐套预览或一键打包下载六套 JPG 模板。

豆包纯色底模式会在颜色去除后清理底部横向延伸的落地阴影或背景尾巴，不按色相侵入粉色商品本身；真正透明的 PNG/WebP 仍可作为原图图层直接载入。

主体图层支持画布拖动、缩放、旋转、透明度、水平翻转和自然投影开关。横版咖啡背景为项目专用的无文字、无品牌场景底板，品牌文案由 Canvas 动态绘制。

精细模式会对最长边不超过 520 像素的小图执行免费的 2 倍整图 ESRGAN 增强，不使用分块推理，避免方形接缝；源图低于约 180 像素时仍建议改用更清晰的商品主图。

商品抠图使用双模型浏览器端方案，图片仅在本机浏览器中处理，不调用付费 API：

- 精细/轻量主模型：IMG.LY `@imgly/background-removal`，AGPL-3.0，来源：https://github.com/imgly/background-removal-js
- 免费备用模型：U²-NetP（Apache-2.0），通过 MIT 许可的 `@bunnio/rembg-web` 与 ONNX Runtime Web 执行。模型来源：https://github.com/bunn-io/rembg-web/releases/tag/base-models

U²-NetP 模型文件 SHA-256：`309C8469258DDA742793DCE0EBEA8E6DD393174F89934733ECC8B14C76F4DDD8`。

上传商品截图，分别框选商品图与商品名称，自动识别文字、增强商品图，并可导出当前模板或批量生成六套模板 ZIP。

## GitHub Pages

推送到 `main` 后，GitHub Actions 会发布 `dist/`：

https://maxineccc.github.io/smart-product-image-studio/
