# 智能商品图生成器

当前版本 v2.0.2：升级为双模板商品图工作台。除原有 800×800 结算单外，新增 1280×720 横版咖啡闪购模板；横版中的品牌名称和饮料主体均可替换。透明 PNG/WebP 可以作为原图图层直接载入，不经过抠图、锐化或色彩修改。上传时会检测真实 Alpha 透明通道，拒绝把棋盘格画进像素的“假透明 PNG”，并提供禁止棋盘格和伪透明的豆包专用复制话术。

主体图层支持画布拖动、缩放、旋转、透明度、水平翻转和自然投影开关。横版咖啡背景为项目专用的无文字、无品牌场景底板，品牌文案由 Canvas 动态绘制。

精细模式会对最长边不超过 520 像素的小图执行免费的 2 倍整图 ESRGAN 增强，不使用分块推理，避免方形接缝；源图低于约 180 像素时仍建议改用更清晰的商品主图。

商品抠图使用双模型浏览器端方案，图片仅在本机浏览器中处理，不调用付费 API：

- 精细/轻量主模型：IMG.LY `@imgly/background-removal`，AGPL-3.0，来源：https://github.com/imgly/background-removal-js
- 免费备用模型：U²-NetP（Apache-2.0），通过 MIT 许可的 `@bunnio/rembg-web` 与 ONNX Runtime Web 执行。模型来源：https://github.com/bunn-io/rembg-web/releases/tag/base-models

U²-NetP 模型文件 SHA-256：`309C8469258DDA742793DCE0EBEA8E6DD393174F89934733ECC8B14C76F4DDD8`。

上传商品截图，分别框选商品图与商品名称，自动识别文字、增强商品图，并导出白底 800×800、低于 400 KB 的 JPG。

## GitHub Pages

推送到 `main` 后，GitHub Actions 会发布 `dist/`：

https://maxineccc.github.io/smart-product-image-studio/
