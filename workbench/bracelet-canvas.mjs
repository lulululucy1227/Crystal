import { Canvas, Circle, FabricImage, FabricText, Group, Rect } from '/vendor/fabric/index.min.mjs';

const TAU = Math.PI * 2;
const removalPadding = 48;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function geometry(canvas, state) {
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const center = { x: width / 2, y: height / 2 };
  const trayRadius = Math.min(width, height) * 0.44;
  let radius = Math.max(72, Math.min(width, height) * 0.34);
  let braceletScale;
  if (state?.layoutMode === 'bracelet' && state.instances.length) {
    const sizes = state.instances.map(instance => Number(instance.sizeMm || state.fallbackBeadMm));
    const total = sizes.reduce((sum, size) => sum + size, 0);
    const maxSize = Math.max(...sizes);
    // Centers follow cumulative half-size angles. Fit their adjacent chords,
    // then scale the entire bracelet together, including its ring radius.
    let unitRadius = 0;
    if (sizes.length > 1) sizes.forEach((size, index) => {
      const pairSize = size + sizes[(index + 1) % sizes.length];
      unitRadius = Math.max(unitRadius, pairSize / (4 * Math.sin(Math.PI * pairSize / (2 * total))));
    });
    braceletScale = Math.min(96 / maxSize, (trayRadius - 12) / (unitRadius + maxSize / 2));
    radius = unitRadius * braceletScale;
  }
  return { center, radius, trayRadius, braceletScale };
}

function pointForSlot(slotIndex, capacity, center, radius) {
  const angle = ((slotIndex / Math.max(1, capacity)) * TAU) - (Math.PI / 2);
  return { x: center.x + (Math.cos(angle) * radius), y: center.y + (Math.sin(angle) * radius) };
}

function projectPointToRing(point, center, radius) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.hypot(dx, dy) || 1;
  return { x: center.x + ((dx / distance) * radius), y: center.y + ((dy / distance) * radius) };
}

function slotForPoint(point, capacity, center) {
  const angle = Math.atan2(point.y - center.y, point.x - center.x) + (Math.PI / 2);
  const normalized = ((angle % TAU) + TAU) % TAU;
  return Math.round((normalized / TAU) * capacity) % capacity;
}

function fallbackBead(instance, material, position, diameter) {
  const shapeOptions = {
    fill: '#e2e4e3', stroke: '#76817e', strokeWidth: 1,
    originX: 'center', originY: 'center',
  };
  // These are technical placeholders, not mineral appearance or exact cutout claims.
  const circle = instance.form && instance.form !== 'round'
    ? new Rect(instance.form === 'connector'
      ? { ...shapeOptions, width: diameter, height: diameter * 0.35, rx: diameter * 0.06, ry: diameter * 0.06 }
      : { ...shapeOptions, width: diameter / Math.SQRT2, height: diameter / Math.SQRT2, angle: 45 })
    : new Circle({
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
    hasBorders: false,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    representationClass: 'fallback',
  });
}

async function imageBead(instance, material, position, diameter) {
  if (instance.form && instance.form !== 'round' && !instance.imageUrl && !material.imageUrl) return fallbackBead(instance, material, position, diameter);
  const atlas = instance.imageUrl ? null : instance.atlas || material.atlas;
  const sourceUrl = instance.imageUrl || instance.atlas?.url || material.imageUrl || atlas?.url;
  if (!sourceUrl) return fallbackBead(instance, material, position, diameter);
  const instanceOwnsSource = Boolean(instance.imageUrl || instance.atlas?.url);
  const sameResolvedSource = sourceUrl === material.imageUrl || sourceUrl === material.atlas?.url;
  const sourceClasses = instanceOwnsSource
    ? [instance.provenanceClass, sameResolvedSource ? material.provenanceClass : undefined]
    : [material.provenanceClass];
  const representationClass = sourceClasses.find(value => value && value !== 'fallback') || 'fallback';
  try {
    const image = await FabricImage.fromURL(sourceUrl, { crossOrigin: 'anonymous' });
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
      hasBorders: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      representationClass,
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
  let renderedKey = '';
  let disposed = false;
  let renderedObjects = [];
  let selectionOutline;

  function showSelection(object) {
    if (!selectionOutline) return;
    selectionOutline.set(object ? {
      visible: true, left: object.left, top: object.top,
      radius: object.data.diameter / 2 + 4,
    } : { visible: false });
  }

  const emit = (command) => onCommand?.(command);

  async function render(nextState = currentState) {
    if (disposed) return;
    currentState = nextState;
    const snapshot = nextState;
    const key = JSON.stringify([canvas.getWidth(), canvas.getHeight(), snapshot.layoutMode, snapshot.capacity, snapshot.fallbackBeadMm, snapshot.instances]);
    if (key === renderedKey) {
      renderSequence += 1;
      const selected = renderedObjects.find((object) => object.data?.instanceId === currentState.selectedInstanceId);
      if (selected) canvas.setActiveObject(selected);
      else canvas.discardActiveObject();
      showSelection(selected);
      canvas.requestRenderAll();
      return;
    }
    const sequence = ++renderSequence;
    const { center, radius, trayRadius, braceletScale } = geometry(canvas, snapshot);
    const isStudio = snapshot.layoutMode === 'loose' || snapshot.layoutMode === 'bracelet';
    const guide = new Circle({
      left: center.x,
      top: center.y,
      radius: isStudio ? trayRadius : radius,
      originX: 'center',
      originY: 'center',
      fill: isStudio ? '#e7dfd3' : 'rgba(250,249,245,0.72)',
      stroke: isStudio ? '#bdb1a1' : '#b8b2a8',
      strokeWidth: isStudio ? 2 : 1,
      ...(isStudio ? { shadow: { color: 'rgba(65,49,30,0.16)', blur: 16, offsetX: 0, offsetY: 7 } } : { strokeDashArray: [4, 5] }),
      selectable: false,
      evented: false,
    });
    const maxMm = Math.max(snapshot.fallbackBeadMm, ...snapshot.instances.map(instance => Number(instance.sizeMm || snapshot.fallbackBeadMm)));
    const studioScale = braceletScale ?? Math.min(canvas.getWidth() / 110, 96 / maxMm);
    const objects = await Promise.all(snapshot.instances.map(async (instance) => {
      const material = resolveMaterial?.(instance.materialName, instance) || {};
      const slotDiameter = (TAU * radius) / Math.max(1, snapshot.capacity);
      const diameter = snapshot.layoutMode
        ? Number(instance.sizeMm || snapshot.fallbackBeadMm) * studioScale
        : clamp(slotDiameter * (Number(instance.sizeMm || snapshot.fallbackBeadMm) / snapshot.fallbackBeadMm) * 0.9, 28, 72);
      const looseRadius = Math.max(1, trayRadius - diameter / 2);
      const angle = Number(instance.angle) * Math.PI / 180;
      const position = snapshot.layoutMode === 'loose'
        ? { x: center.x + (instance.looseX - 0.5) * 2 * looseRadius, y: center.y + (instance.looseY - 0.5) * 2 * looseRadius }
        : snapshot.layoutMode === 'bracelet'
          ? { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
          : pointForSlot(instance.slotIndex, snapshot.capacity, center, radius);
      const object = await imageBead(instance, material, position, diameter);
      object.set({
        data: { instanceId: instance.instanceId, materialName: instance.materialName, diameter },
        hoverCursor: 'grab',
        moveCursor: 'grabbing',
      });
      return object;
    }));
    if (sequence !== renderSequence || disposed) {
      objects.forEach(object => object.dispose?.());
      return;
    }
    canvas.discardActiveObject();
    canvas.clear();
    canvas.add(guide);
    if (isStudio) canvas.add(new Circle({
      left: center.x, top: center.y, radius: trayRadius - 7,
      originX: 'center', originY: 'center',
      fill: 'transparent', stroke: '#f5efe7', strokeWidth: 2,
      selectable: false, evented: false,
    }));
    // A quiet outline follows the selected bead without changing its image or
    // intercepting pointer events. Fabric's rectangular borders stay disabled.
    selectionOutline = new Circle({
      selectionIndicator: true, visible: false, radius: 0,
      originX: 'center', originY: 'center',
      fill: 'transparent', stroke: '#637b6a', strokeWidth: 1.5,
      selectable: false, evented: false,
    });
    canvas.add(selectionOutline);
    objects.forEach((object) => canvas.add(object));
    renderedObjects = objects;
    renderedKey = key;
    const selected = objects.find((object) => object.data?.instanceId === currentState.selectedInstanceId);
    if (selected) canvas.setActiveObject(selected);
    showSelection(selected);
    if (canvasElement.dataset) {
      canvasElement.dataset.layoutMode = snapshot.layoutMode || 'slots';
      canvasElement.dataset.instanceGeometry = JSON.stringify(objects.map(object => ({ instanceId: object.data.instanceId, x: object.left, y: object.top, diameter: object.data.diameter, representationClass: object.representationClass || 'fallback' })));
    }
    canvas.requestRenderAll();
  }

  function resize() {
    const host = canvasElement.parentElement;
    const size = clamp(Math.min(host?.clientWidth || 520, host?.clientHeight || 520), 300, 620);
    canvas.setDimensions({ width: size, height: size });
    render(currentState);
  }

  function finishDrag(command) {
    renderedKey = '';
    const sequence = renderSequence;
    emit(command);
    if (sequence === renderSequence) render(currentState);
  }

  canvas.on('mouse:down', (event) => {
    if (event.target?.data?.instanceId) {
      emit({ type: 'select-instance', instanceId: event.target.data.instanceId });
      return;
    }
    if (!currentState.activeMaterialName) return;
    const pointer = canvas.getScenePoint(event.e);
    const { center, trayRadius } = geometry(canvas);
    if (currentState.layoutMode && Math.hypot(pointer.x - center.x, pointer.y - center.y) > trayRadius) return;
    const slotIndex = slotForPoint(pointer, currentState.capacity, center);
    const material = resolveMaterial?.(currentState.activeMaterialName) || {};
    emit({
      ...material,
      type: 'place',
      materialName: currentState.activeMaterialName,
      sizeMm: material.sizeMm || currentState.fallbackBeadMm,
      assetRef: material.assetRef || '',
      provenanceClass: material.provenanceClass || 'generated_from_evidence',
      slotIndex,
      ...(currentState.layoutMode === 'loose' ? { looseX: 0.5 + (pointer.x - center.x) / (2 * trayRadius), looseY: 0.5 + (pointer.y - center.y) / (2 * trayRadius) } : {}),
    });
  });

  canvas.on('object:moving', (event) => {
    const object = event.target;
    if (!object?.data?.instanceId) return;
    const { center, radius, trayRadius } = geometry(canvas, currentState);
    const distance = Math.hypot(object.left - center.x, object.top - center.y);
    const outsideRing = distance > (currentState.layoutMode === 'loose' ? trayRadius : radius) + removalPadding;
    object.set({ opacity: outsideRing ? 0.55 : 1 });
    if (outsideRing) { showSelection(object); return; }
    if (currentState.layoutMode === 'loose') {
      const allowedRadius = Math.max(1, trayRadius - object.data.diameter / 2);
      if (distance > allowedRadius) {
        const projected = projectPointToRing({ x: object.left, y: object.top }, center, allowedRadius);
        object.set({ left: projected.x, top: projected.y });
      }
      showSelection(object);
      return;
    }
    const projected = projectPointToRing({ x: object.left, y: object.top }, center, radius);
    object.set({ left: projected.x, top: projected.y });
    showSelection(object);
  });

  canvas.on('object:modified', (event) => {
    const object = event.target;
    if (!object?.data?.instanceId) return;
    const { center, radius, trayRadius } = geometry(canvas, currentState);
    const distance = Math.hypot(object.left - center.x, object.top - center.y);
    const outsideRing = distance > (currentState.layoutMode === 'loose' ? trayRadius : radius) + removalPadding;
    if (outsideRing) {
      finishDrag({ type: 'remove', instanceId: object.data.instanceId });
      return;
    }
    if (currentState.layoutMode === 'loose') {
      const allowedRadius = Math.max(1, trayRadius - object.data.diameter / 2);
      finishDrag({ type: 'move', instanceId: object.data.instanceId, looseX: 0.5 + (object.left - center.x) / (2 * allowedRadius), looseY: 0.5 + (object.top - center.y) / (2 * allowedRadius) });
      return;
    }
    if (currentState.layoutMode === 'bracelet') {
      const angle = Math.atan2(object.top - center.y, object.left - center.x) * 180 / Math.PI;
      let targetIndex = 0;
      let nearest = Infinity;
      currentState.instances.forEach((instance, index) => {
        const distance = Math.abs(((angle - instance.angle + 540) % 360) - 180);
        if (distance < nearest) { nearest = distance; targetIndex = index; }
      });
      finishDrag({ type: 'move', instanceId: object.data.instanceId, targetIndex });
      return;
    }
    finishDrag({
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
      disposed = true;
      renderSequence += 1;
      canvas.dispose();
    },
  };
}
