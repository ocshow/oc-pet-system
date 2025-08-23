# 透明背景视频处理指南

## 问题描述
透明背景的视频在网页上显示为黑色背景，这是因为浏览器对MP4格式的透明通道支持有限。

## 解决方案

### 方案1：转换为WebM格式（推荐）

#### 使用FFmpeg转换
```bash
# 将MP4转换为WebM（支持透明通道）
ffmpeg -i input.mp4 -c:v libvpx-vp9 -pix_fmt yuva420p -crf 30 -b:v 0 output.webm

# 或者使用VP8编码（兼容性更好）
ffmpeg -i input.mp4 -c:v libvpx -pix_fmt yuva420p -crf 30 -b:v 0 output.webm
```

#### 使用在线工具
1. **CloudConvert** - 支持多种格式转换
2. **Convertio** - 在线视频转换
3. **Zamzar** - 免费在线转换

### 方案2：使用混合模式（MP4格式）

如果必须使用MP4格式，系统提供了多种混合模式来改善显示效果：

#### 支持的混合模式
1. **正常模式** (`normal`) - 原始显示
2. **正片叠底** (`multiply`) - 适合深色背景
3. **滤色** (`screen`) - 适合浅色背景
4. **叠加** (`overlay`) - 增强对比度

#### 使用方法
1. 加载视频后，点击视频左下角的🎨按钮
2. 循环切换不同的混合模式
3. 选择最适合你视频的显示效果

### 方案3：视频制作建议

#### 制作透明背景视频
1. **使用支持透明通道的软件**：
   - Adobe After Effects
   - Blender
   - DaVinci Resolve
   - OpenShot

2. **导出设置**：
   - 格式：WebM (推荐) 或 MP4
   - 编码：VP9 (WebM) 或 H.264 (MP4)
   - 像素格式：yuva420p (支持Alpha通道)
   - 背景：透明

#### 视频内容建议
- 使用纯色或渐变背景，便于后期处理
- 避免复杂的背景图案
- 确保主体内容清晰可见

## 技术参数

### WebM格式（推荐）
```
容器格式：WebM
视频编码：VP9 或 VP8
像素格式：yuva420p
音频编码：Opus（可选）
分辨率：480x480 或更高
帧率：24-30fps
```

### MP4格式（备选）
```
容器格式：MP4
视频编码：H.264
像素格式：yuv420p（不支持透明）
音频编码：AAC（可选）
分辨率：480x480 或更高
帧率：24-30fps
```

## 浏览器兼容性

### WebM格式支持
- Chrome 23+
- Firefox 28+
- Edge 79+
- Safari 14.1+

### MP4格式支持
- Chrome 3+
- Firefox 21+
- Safari 3.1+
- Edge 12+

## 测试方法

1. **本地测试**：
   - 将视频文件放在 `assets/` 目录
   - 刷新页面查看效果
   - 测试不同的混合模式

2. **浏览器测试**：
   - Chrome
   - Firefox
   - Safari
   - Edge

3. **设备测试**：
   - 桌面电脑
   - 平板电脑
   - 手机

## 常见问题

### Q: 为什么WebM视频无法播放？
A: 检查浏览器是否支持WebM格式，或尝试使用MP4格式配合混合模式。

### Q: 混合模式效果不理想怎么办？
A: 尝试调整视频内容，使用更简单的背景或更高的对比度。

### Q: 如何制作透明背景视频？
A: 使用支持透明通道的软件，如After Effects、Blender等，导出时选择支持Alpha通道的格式。

## 工具推荐

### 视频编辑软件
- **免费**：Blender, DaVinci Resolve, OpenShot
- **付费**：Adobe After Effects, Premiere Pro

### 在线转换工具
- CloudConvert
- Convertio
- Zamzar

### 命令行工具
- FFmpeg
- HandBrake 