# 智能商品图生成器

当前版本 v1.7：新增“豆包绿幕图”入口。用户可在豆包 APP/网页手动生成纯绿色背景商品图，上传后由浏览器自动去绿、消除绿色溢色、增强立体光影并替换模板中间主体，无需方舟 API 或本地显卡。

精细模式会对最长边不超过 520 像素的小图执行免费的 2 倍整图 ESRGAN 增强，不使用分块推理，避免方形接缝；源图低于约 180 像素时仍建议改用更清晰的商品主图。

商品抠图使用双模型浏览器端方案，图片仅在本机浏览器中处理，不调用付费 API：

- 精细/轻量主模型：IMG.LY `@imgly/background-removal`，AGPL-3.0，来源：https://github.com/imgly/background-removal-js
- 免费备用模型：U²-NetP（Apache-2.0），通过 MIT 许可的 `@bunnio/rembg-web` 与 ONNX Runtime Web 执行。模型来源：https://github.com/bunn-io/rembg-web/releases/tag/base-models

U²-NetP 模型文件 SHA-256：`309C8469258DDA742793DCE0EBEA8E6DD393174F89934733ECC8B14C76F4DDD8`。

上传商品截图，分别框选商品图与商品名称，自动识别文字、增强商品图，并导出白底 800×800、低于 400 KB 的 JPG。

## GitHub Pages

推送到 `main` 后，GitHub Actions 会发布 `dist/`：

https://maxineccc.github.io/smart-product-image-studio/
