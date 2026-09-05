import { buildLaunchBoard, differenceMatrix } from './nature-launch.mjs';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const themeNames = { Mountain: '山', Ocean: '海', Forest: '森林', Sunrise: '日出', Starlight: '星辰', Glacier: '冰川' };
const structureNames = {
  archetype: '结构类型', symmetry: '对称性', focal_strategy: '主石策略', bead_rhythm: '排珠节奏',
  metal_level: '金属用量', negative_space: '留白', wear_language: '佩戴语言',
};
const validationNames = { PASS: '结构校验通过', WARN: '结构校验有提醒', FAIL: '结构校验失败', NOT_RUN: '未运行校验' };
const countText = (summary, fields) => fields.filter(([key]) => Number.isInteger(summary?.[key]) && summary[key] > 0)
  .map(([key, label]) => `${label} ${summary[key]}`).join(' · ');

export function renderPortfolio(validation) {
  if (!validation || !Array.isArray(validation.designs) || !validation.designs.length) {
    return '<p class="p4-note">正式设计包尚未交付；不会用测试设计冒充首发方案。</p>';
  }
  const groups = buildLaunchBoard(validation);
  const designsById = new Map(validation.designs.map(design => [design.design_id, design]));
  const duplicateIds = new Set(validation.designs.filter((design, index, all) => all.findIndex(other => other.design_id === design.design_id) !== index).map(design => design.design_id));
  const comparisons = differenceMatrix(validation.designs).sort((a, b) => Number(b.sameTheme) - Number(a.sameTheme) || Number(b.duplicateStructure) - Number(a.duplicateStructure));
  const sameThemeCount = comparisons.filter(row => row.sameTheme).length;
  const repeatCount = comparisons.filter(row => row.duplicateStructure).length;

  const cards = groups.map(group => `<section data-portfolio-theme="${escapeHtml(group.theme)}">
    <h3>${themeNames[group.theme]} <small lang="en">${escapeHtml(group.theme)}</small></h3>
    ${group.cards.map(card => {
      const design = designsById.get(card.designId);
      const ready = ['PASS', 'WARN'].includes(card.validationStatus) && !duplicateIds.has(card.designId);
      const sourceStatus = countText(card.materialStatus, [['approved', 'APPROVED'], ['proposed', 'PROPOSED'], ['unresolved', 'UNRESOLVED']]) || '材料状态未统计';
      const mappingStatus = countText(card.materialStatus, [['mapped', '已匹配 MAPPED'], ['unmapped', '未匹配 UNMAPPED'], ['not_checked', '未核验 NOT_CHECKED']]) || '映射未核验 NOT_CHECKED';
      const errors = design.validation?.errors || [];
      return `<button type="button" data-design="${escapeHtml(card.designId)}"${ready ? '' : ' disabled aria-disabled="true"'}>
        <strong>${escapeHtml(card.zhName)}</strong>
        <small lang="en">${escapeHtml(card.enName)}</small>
        <small>${escapeHtml(card.designId)}</small>
        <span>结构：${escapeHtml(card.archetype || '未提供')} · 手围 ${escapeHtml(card.wristCm)} cm</span>
        <span>核心材料：${escapeHtml(card.coreMaterials.join('、') || '未提供')}</span>
        <span>材料声明：${escapeHtml(sourceStatus)}</span>
        <small>采购映射：${escapeHtml(mappingStatus)}</small>
        <span>${escapeHtml(validationNames[card.validationStatus] || '未知校验状态')} · ${escapeHtml(card.validationStatus)}</span>
        ${card.duplicateStructureWarning ? '<span>重复提醒：结构指纹相同，请对照差异表复核。</span>' : ''}
        ${errors.length ? `<small>待修正：${escapeHtml(errors.join('；'))}</small>` : ''}
        <small>${ready ? '载入本地可编辑副本' : '暂不可载入，请修正后重新校验'}</small>
      </button>`;
    }).join('')}
  </section>`).join('');

  const matrixRows = comparisons.map(row => {
    const a = designsById.get(row.designA), b = designsById.get(row.designB);
    const differences = row.structuralDifferences.map(key => `${structureNames[key]}：${a.structure_signature?.[key] || '未提供'} → ${b.structure_signature?.[key] || '未提供'}`).join('；');
    const overlap = typeof row.materialOverlap === 'number' && Number.isFinite(row.materialOverlap) ? `${Math.round(row.materialOverlap * 100)}%` : '未能比较';
    return `<tr data-comparison-row>
      <th scope="row">${escapeHtml(a.zh_name)} / ${escapeHtml(b.zh_name)}<br><small>${escapeHtml(row.designA)} / ${escapeHtml(row.designB)}</small></th>
      <td>${row.sameTheme ? '同主题' : '跨主题'}</td>
      <td>${escapeHtml(differences || '所声明的结构字段无差异')}</td>
      <td>${row.duplicateStructure ? '结构指纹相同，需复核' : '结构指纹不同'}</td>
      <td>${overlap}</td>
    </tr>`;
  }).join('');

  return `${validation.fixture ? '<p class="p4-note">合成测试数据，仅验证软件能力，不是正式首发设计。</p>' : ''}
    <p>${validation.ok ? '设计包数据检查通过' : '设计包存在待核对项'} · ${validation.designs.length} 款。声明状态不等于采购映射已核验，也不代表审美批准。</p>
    <p class="p4-note">PROPOSED 待采购确认；UNRESOLVED 身份或规格不足。NOT_CHECKED 尚未核验采购记录；UNMAPPED 已核验但未匹配。</p>
    <div class="p4-board">${cards}</div>
    <details class="p4-difference-matrix">
      <summary>结构差异矩阵 · 同主题 ${sameThemeCount} 组 / 全系列 ${comparisons.length} 组 · 重复提醒 ${repeatCount} 组</summary>
      <p class="p4-note">优先列出同主题对照。名称或颜色变化不算结构差异；材料重叠按稳定材料 ID 的交集 / 并集计算，不代表视觉相似程度。</p>
      <div class="p4-table-scroll"><table>
        <caption>设计结构与材料重叠对照</caption>
        <thead><tr><th scope="col">设计对照</th><th scope="col">主题关系</th><th scope="col">结构差异</th><th scope="col">重复风险</th><th scope="col">材料重叠</th></tr></thead>
        <tbody>${matrixRows}</tbody>
      </table></div>
    </details>`;
}
