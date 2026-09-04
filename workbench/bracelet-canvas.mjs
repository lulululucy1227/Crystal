import { Canvas, Circle, FabricImage, FabricText, Group } from '/vendor/fabric/index.min.mjs';

const TAU = Math.PI * 2;
const removalPadding = 48;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function geometry(canvas) {
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const center = { x: width / 2, y: height / 2 };
  const radius = Math.max(72, Math.min(width, height) * 0.34);
  return { center, radius };
}

function pointForSlot(slotIndex, capacity, center, radius) {
  const angle = ((slotIndex / Math.max(1, capacity)) * TAU) - (Math.PI / 2);
  return { x: center.x + (Math.cos(angle) * radius), y: center.y + (Math.sin(angle) * radius) };
}

function slotForPoint(point, capacity, center) {
  const angle = Math.atan2(point.y - center.y, point.x - center.x) + (Math.PI / 2);
  const normalized = ((angle % TAU) + TAU) % TAU;
  return Math.round((normalized / TAU) * capacity) % capacity;
}

function fallbackBead(instance, material, position, diameter) {
  const circle = new Circle({
    radius: diameter / 2,
    fill: material.fallbackColor || '#d7dde0',
    stroke: instance.provenanceClass === 'generated_from_evidence' ? '#65717a' : '#806e55',
    strokeWidth: 1,
    originX: 'center',
    originY: 'center',
  });
  const label = new FabricText(material.shortLabel || material.zhName?.slice(0, 1) || '珠', {
    fontFamily: 'Microsoft YaHei UI, sans-serif',
    fontSize: Math.max(10, diameter * 0.28),
    fill: '#24323a',
    originX: 'center',
    originY: 'center',
  });
  return new Group([circle, label], {
    left: position.x,
    top: position.y,
    originX: 'center',
    originY: 'center',
    hasControls: false,
    hasBorders: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
  });
}

async function imageBead(instance, material, position, diameter) {
  const sourceUrl = material.imageUrl || material.atlas?.url;
  if (!sourceUrl) return fallbackBead(instance, material, position, diameter);
  try {
    const image = await FabricImage.fromURL(sourceUrl, { crossOrigin: 'anonymous' });
    const atlas = material.atlas;
    const columns = Math.max(1, Number(atlas?.columns) || 1);
    const rows = Math.max(1, Number(atlas?.rows) || 1);
    const sourceWidth = atlas ? (image.width || diameter) / columns : (image.width || diameter);
    const sourceHeight = atlas ? (image.height || diameter) / rows : (image.height || diameter);
    const atlasIndex = Math.max(0, Number(atlas?.index) || 0);
    image.set({
      left: position.x,
      top: position.y,
      cropX: atlas ? (atlasIndex % columns) * sourceWidth : 0,
      cropY: atlas ? Math.floor(atlasIndex / columns) * sourceHeight : 0,
      width: sourceWidth,
      height: sourceHeight,
      originX: 'center',
      originY: 'center',
      scaleX: diameter / sourceWidth,
      scaleY: diameter / sourceHeight,
      hasControls: false,
      hasBorders: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    });
    return image;
  } catch {
    return fallbackBead(instance, material, position, diameter);
  }
}

export function createBraceletCanvas({ canvasElement, state, resolveMaterial, onCommand }) {
  if (!canvasElement) throw new TypeError('canvasElement is required');
  const canvas = new Canvas(canvasElement, {
    selection: false,
    preserveObjectStacking: true,
    renderOnAddRemove: false,
  });
  let currentState = state;
  let renderSequence = 0;

  const emit = (command) => onCommand?.(command);

  async function render(nextState = currentState) {
    currentState = nextState;
    const sequence = ++renderSequence;
    canvas.discardActiveObject();
    canvas.clear();
    const { center, radius } = geometry(canvas);
    canvas.add(new Circle({
      left: center.x,
      top: center.y,
      radius,
      originX: 'center',
      originY: 'center',
      fill: 'rgba(250,249,245,0.72)',
      stroke: '#b8b2a8',
      strokeWidth: 1,
      strokeDashArray: [4, 5],
      selectable: false,
      evented: false,
    }));
    const objects = await Promise.all(currentState.instances.map(async (instance) => {
      const material = resolveMaterial?.(instance.materialName) || {};
      const position = pointForSlot(instance.slotIndex, currentState.capacity, center, radius);
      const slotDiameter = (TAU * radius) / Math.max(1, currentState.capacity);
      const diameter = clamp(slotDiameter * (Number(instance.sizeMm || currentState.fallbackBeadMm) / currentState.fallbackBeadMm) * 0.9, 28, 72);
      const object = await imageBead(instance, material, position, diameter);
      object.set({
        data: { instanceId: instance.instanceId, materialName: instance.materialName },
        borderColor: '#0b4b96',
        cornerColor: '#0b4b96',
        transparentCorners: false,
      });
      return object;
    }));
    if (sequence !== renderSequence) return;
    objects.forEach((object) => canvas.add(object));
    const selected = objects.find((object) => object.data?.instanceId === currentState.selectedInstanceId);
    if (selected) canvas.setActiveObject(selected);
    canvas.requestRenderAll();
  }

  function resize() {
    const host = canvasElement.parentElement;
    const size = clamp(Math.min(host?.clientWidth || 520, host?.clientHeight || 520), 300, 620);
    canvas.setDimensions({ width: size, height: size });
    render(currentState);
  }

  canvas.on('mouse:down', (event) => {
    if (event.target?.data?.instanceId) {
      emit({ type: 'select-instance', instanceId: event.target.data.instanceId });
      return;
    }
    if (!currentState.activeMaterialName) return;
    const pointer = canvas.getScenePoint(event.e);
    const { center } = geometry(canvas);
    const slotIndex = slotForPoint(pointer, currentState.capacity, center);
    const material = resolveMaterial?.(currentState.activeMaterialName) || {};
    emit({
      type: 'place',
      materialName: currentState.activeMaterialName,
      sizeMm: material.sizeMm || currentState.fallbackBeadMm,
      assetRef: material.assetRef || '',
      provenanceClass: material.provenanceClass || 'generated_from_evidence',
      slotIndex,
    });
  });

  canvas.on('object:moving', (event) => {
    const object = event.target;
    if (!object?.data?.instanceId) return;
    const { center, radius } = geometry(canvas);
    const distance = Math.hypot(object.left - center.x, object.top - center.y);
    const outsideRing = distance > radius + removalPadding;
    object.set({ opacity: outsideRing ? 0.55 : 1 });
    if (outsideRing) return;
    const slotIndex = slotForPoint({ x: object.left, y: object.top }, currentState.capacity, center);
    const point = pointForSlot(slotIndex, currentState.capacity, center, radius);
    object.set({ left: point.x, top: point.y });
  });

  canvas.on('object:modified', (event) => {
    const object = event.target;
    if (!object?.data?.instanceId) return;
    const { center, radius } = geometry(canvas);
    const distance = Math.hypot(object.left - center.x, object.top - center.y);
    const outsideRing = distance > radius + removalPadding;
    if (outsideRing) {
      emit({ type: 'remove', instanceId: object.data.instanceId });
      return;
    }
    emit({
      type: 'move',
      instanceId: object.data.instanceId,
      slotIndex: slotForPoint({ x: object.left, y: object.top }, currentState.capacity, center),
    });
  });

  resize();
  return {
    render,
    resize,
    dispose() {
      renderSequence += 1;
      canvas.dispose();
    },
  };
}
