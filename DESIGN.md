---
name: Crystal Studio
description: 私有桌面串珠设计工具；让来源素材与逐颗操作成为主角。
colors:
  primary: "#374039"
  primary-hover: "#536252"
  desk: "#f6f4ef"
  surface: "#fbfaf7"
  ceramic: "#e7dfd3"
  ink: "#302f2b"
  muted: "#625e54"
  edge: "#d8d3c8"
  readout: "#eeece4"
  selected: "#80917a"
  focus: "#4e7664"
  on-primary: "#ffffff"
typography:
  title:
    fontFamily: "Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    letterSpacing: "0.1em"
  body:
    fontFamily: "Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "13px"
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "11px"
rounded:
  field: "8px"
  card: "12px"
  pill: "18px"
spacing:
  control-x: "9px"
  control-y: "5px"
  card: "9px"
  grid: "10px"
  workspace: "22px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    padding: "5px 15px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "5px 9px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "5px 9px"
  material-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "9px"
  readout:
    backgroundColor: "{colors.readout}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
---

# Design System: Crystal Studio

## Overview

**Creative North Star: "安静的桌面串珠工具"**

这是已实现 Studio 的记录，不是新设计提案。轻暖桌面、陶盘色承托面、石墨色控件和克制的灰绿选中线，让来源素材与逐颗操作成为主角。中文操作标签优先，英文与来源编号辅助核对。

范围仅限设计工作室，不把旧目录页面描述为已重新设计。继承用户批准的圆盘／直槽参考逻辑，保留 Crystal 自身名称；没有复制参考应用品牌、结算或销售承诺。

**Key Characteristics:**

- 同一设计，圆盘与直槽两种投影。
- 一颗一身份，视图切换不复制材料。
- 素材轮廓与纹理优先于装饰。
- 功能状态清楚，动画有终点。

## Colors

Primary 石墨绿用于主要操作和已选视图；灰绿色 selected 强调活动材料与珠体轮廓。Neutral desk、surface 与 ceramic 形成轻暖层次，ink 承担正文，muted 承担辅助说明，edge 轻分隔，readout 承托数量和尺寸。颜色以 frontmatter 为规范。

**The Readable Instrument Rule.** 小型操作文字需要真实背景下至少4.5:1的对比度；不能以“轻盈”为由恢复已经发现的低对比度旧色。

## Typography

系统中文友好字体用于操作工具，不设置营销式 display 字体。主标题采用 title，材料名称采用 body 并加粗，支持说明采用 label。库内来源／虚拟尺寸提示目前9–10px，属于高密度工具说明，不提升为其他页面的通用正文规范。

用量数字与表格使用等宽数字特性。英文不超过同项中文的视觉权重，长来源编号允许换行。

## Layout

工作室最大宽度1900px，内边距12px 22px 18px。默认工作区左右比约2.2:1、间距22px；主盘在左，材料库在右独立滚动。工作区高度为视口减206px、最小580px；编辑列允许收缩，展开检查器最高245px且内部滚动，不能遮挡盘下BOM。

1100px以下收紧间距与材料栏；780px以下上下排列，编辑区至少620px、材料区480px；1700px以上材料网格变为三列。展示模式隐藏编辑侧栏与操作行，不重建另一份设计。

圆盘、直槽、散珠、成串、圈数是独立状态。直槽正手／背手只是显示筛选。连续行以自己的最大主体高度拟合、共用缩放比例，不能因一颗大异形珠使所有行的普通珠缩成不可见。圆盘顺序标注位于珠体区域之外。

## Elevation & Depth

普通卡片以背景和边界分层。陶盘使用淡边沿与柔和底影；其质感是二维辅助背景，不承诺物理光照。确认顺序浮层阴影为`0 10px 35px #4a42331f`，表达它高于盘面。

有限转场最长240ms，采用`1-(1-t)^3`减速函数；保留对象与图像缓存，静止时不运行渲染循环。减少动态效果设置禁用不必要转场。

## Shapes

字段轻圆角、材料卡较柔和、主要操作为短胶囊。来源图按主体边界等比显示；不把水滴珍珠和异形件强裁成圆球，也不把整个透明方画布当成珠子尺寸。

**The One Bead Rule.** 每颗珠子具有自己的位置、规格和来源。选中提示跟随可见主体为圆／椭圆细线，不能重新引入方形变换框。

## Components

### Buttons and inputs

主要／次要样式由 frontmatter 定义。普通控件最小高度32px，焦点为focus色2px描边、向外3px；hover改变底色。禁用控件降低透明度并停止操作。删除使用明确中文文案，不用装饰性Unicode图标。

### Navigation and view segments

顶端保留原工作台入口，Studio隐藏旧仿桌面标题／工具栏。圆盘／直槽与正手／背手分组通过`aria-pressed`表达选中，切换不改变材料账本。

### Material cards

中文名、辅助英文／来源、86px等比图片、虚拟尺寸与形态、数量加减组成卡片。活动卡采用selected色细边。点击卡片激活；添加需要明确加号或拖入，不跳转页面。

### Canvas and readout

同一组稳定珠子实例由纯布局映射到盘面。主体碰撞范围与采购沿线尺寸分开；异形件使用保守包围范围。成串前给出可取消的顺序预览。用量即时更新，近似内圈同时显示需打样提醒；未知价格不能显示为零成本。

### Inspector and export

逐颗编辑与设计设置按需展开。保存保持身份／规格／来源；实排PNG来自当前画布，而非新生成的效果图。详细用料与导出入口保留在BOM中。

## Do's and Don'ts

### Do:

- Do 保留中文优先、来源可追溯与独立逐颗操作。
- Do 在真实小尺寸检查珠体纹理、非圆轮廓和标注遮挡。
- Do 保持有限动画、键盘操作和明确撤销路径。
- Do 将尺寸与佩戴效果标为近似并提示实物复核。

### Don't:

- Don't 将源图标签升级为矿物身份、真实品质或采购事实。
- Don't 将生成参考图写成实拍，或将二维排布写成物理模拟。
- Don't 让选材跳走设计上下文，或把同种珠子锁成一个组合。
- Don't 让宽透明留白决定珠子尺寸，或裁掉异形主体。
