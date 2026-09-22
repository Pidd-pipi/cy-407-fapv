# 工艺品3D展示画廊

沉浸式 3D 虚拟展厅，用于展示非遗手工艺品的立体细节、标注信息和自定义导览路线，所有数据保存在浏览器本地。

## 功能列表

- 3D 展厅：Three.js 渲染展厅空间，支持拖拽旋转、滚轮缩放、点击展品查看详情。
- 展品详情：独立 360° 模型查看器，右侧信息面板展示作者、工艺、材质、尺寸和标注。
- 展览管理：创建、编辑、删除展览，调整展品顺序，设置主题色并发布。
- 导览编辑：时间轴式节点编辑，配置展品、相机位置、目标点、过渡时长和讲解文字。
- 展品库：网格/列表视图切换，维护展品资料，上传本地图片和 GLB/GLTF 模型。
- 本地持久化：IndexedDB 保存四类业务实体，File API + Blob 保存图片和 3D 模型文件。
- Three.js 生命周期：统一 renderer 管理、动画循环和组件卸载资源释放。

## 快速启动

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

开发服务器端口固定为 `28313`。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端框架 | Vue 3 + TypeScript |
| UI 组件库 | Naive UI |
| 构建工具 | Vite |
| 状态管理 | Pinia |
| 3D 引擎 | Three.js |
| 本地存储 | IndexedDB、File API、idb |
| 辅助依赖 | @vueuse/core、@types/three |

## 目录结构

```text
frontend/src/
├── api/           # storage.ts：IndexedDB 数据层仓库
├── stores/        # artifact.ts, exhibition.ts, annotation.ts, tour.ts
├── types/         # artifact.ts, exhibition.ts, annotation.ts, tour.ts, enums.ts
├── components/
│   ├── common/    # SceneCanvas, ArtifactCard, InfoPanel, FileUploader, ExhibitionCard
│   ├── viewer/    # ModelViewer, AnnotationRenderer, CameraControls, ArtifactPanel
│   └── editor/    # ArtifactPicker, TourTimeline, CameraSetter
├── hooks/         # useThreeScene, useIndexedDB, useAnimationLoop
├── pages/         # Gallery, ArtifactDetail, ExhibitionManage, TourEditor, ArtifactManage
├── router/
├── styles/
└── utils/         # storage.ts, renderer.ts, model-loader.ts, tour-player.ts
```

## 3D功能截图占位

> 启动后访问 `http://localhost:28313/exhibitions/exhibition-heritage-hall`，在此处替换为展厅截图。

```text
[ 3D 展厅截图占位 ]
```

## License

MIT
