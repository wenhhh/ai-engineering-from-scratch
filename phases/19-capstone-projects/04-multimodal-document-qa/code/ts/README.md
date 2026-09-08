# 综合实践 04：多模态文档问答（Multimodal Document QA，TypeScript）

查看器骨架返回文档页面图像的 URL，以及被引用边界框（Bounding Box）的 JSON 列表。
HTML 响应内嵌一段简短的画布叠加（Canvas Overlay）脚本，
在页面图像上绘制引用区域。它与 `../main.py` 中的 Python
流水线配合使用。

## 目录结构（Layout）

```text
ts/
  package.json
  tsconfig.json
  src/
    index.ts        # 入口，演示 + HTTP 服务器
    server.ts       # hono 应用，/health、/、/document/:id
    fixtures.ts     # 10-K 表格 + Nature 图形测试夹具（Fixture）
    render.ts       # HTML 索引页 + 逐文档叠加层渲染器（Overlay Renderer）
    types.ts        # DocumentFixture, EvidenceRegion, BoundingBox
  tests/
    fixtures.test.ts
    render.test.ts
    server.test.ts
```

## 运行（Run）

```bash
npm install
npm run typecheck
npm test
npm start          # 执行一轮自检，以状态码 0 退出
npm run serve      # 在 127.0.0.1:<port> 上运行交互式 HTTP 服务器
```

未设置 `PORT` 时，交互式服务器会选择空闲端口，并将
所选 URL 打印到标准输出（Standard Output）。访问 `/` 查看索引页，访问 `/document/10k-acme-2025` 查看
演示叠加层，或设置 `accept: application/json` 获取结构化响应。

## 测试（Tests）

通过 tsx 使用 `node --test` 测试运行器。测试覆盖测试夹具查找（正例与反例）、
五种危险字符的 HTML 转义（Escaping）、文档 HTML 载荷（Payload）结构，
以及 hono 路由（200、404、内容协商（Content Negotiation））。
