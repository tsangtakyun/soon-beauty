import type { Product } from '@/types/database';

export type MakeupShareTemplate = {
  id: 'product-catalog' | 'annotated-breakdown';
  name: string;
  tagline: string;
  description: string;
  orientation: 'portrait';
  tone: string;
  composition: string[];
  stylingKeywords: string[];
};

export type MakeupSharePromptInput = {
  templateId: MakeupShareTemplate['id'];
  title: string | null;
  notes: string | null;
  selfieUrl: string | null;
  selectedProducts: Array<Pick<Product, 'name' | 'brand'>>;
};

export const DEFAULT_MAKEUP_SHARE_TEMPLATE_ID: MakeupShareTemplate['id'] = 'annotated-breakdown';

export const MAKEUP_SHARE_TEMPLATES: MakeupShareTemplate[] = [
  {
    id: 'product-catalog',
    name: '產品清單版',
    tagline: '左邊自拍，右邊清楚列出今天用了什麼化妝品',
    description: '以產品清單為主，最清楚呈現今次妝容使用的化妝品與重點。',
    orientation: 'portrait',
    tone: '奶茶米白色系、高級留白、溫柔紙本感、清楚可讀',
    composition: ['左邊是自拍主圖', '右邊是產品清單欄', '每項產品包含類別、品牌、產品名與一句短描述'],
    stylingKeywords: ['beauty editorial catalog', 'cream beige palette', 'clean luxury layout', 'products used board'],
  },
  {
    id: 'annotated-breakdown',
    name: '旁註解析版',
    tagline: '用細線與小標註指出這次妝容各部位用了什麼產品',
    description: '以自拍為主角，搭配臉部旁註與小字解析，更有妝容拆解感。',
    orientation: 'portrait',
    tone: '柔和奶茶感、手寫旁註、溫柔雜誌頁、生活感',
    composition: ['自拍作為主視覺', '以細線標註眼妝、胭脂、唇妝、底妝', '標註內容清楚顯示產品類別、品牌與產品名'],
    stylingKeywords: ['annotated makeup breakdown', 'soft editorial notes', 'cream paper mood', 'beauty callouts'],
  },
];

export function getMakeupShareTemplate(templateId: MakeupShareTemplate['id']) {
  const defaultTemplate =
    MAKEUP_SHARE_TEMPLATES.find((template) => template.id === DEFAULT_MAKEUP_SHARE_TEMPLATE_ID) ??
    MAKEUP_SHARE_TEMPLATES[0];

  return (
    MAKEUP_SHARE_TEMPLATES.find((template) => template.id === templateId) ??
    defaultTemplate
  );
}

export function buildMakeupSharePrompt(input: MakeupSharePromptInput) {
  const template = getMakeupShareTemplate(input.templateId);
  const productList = input.selectedProducts.length
    ? input.selectedProducts
        .map((product, index) => `${index + 1}. ${product.brand ? `${product.brand} ` : ''}${product.name}`)
        .join('\n')
    : '未提供產品資料';

  const title = input.title?.trim() || '今日妝容';
  const notes = input.notes?.trim() || '未有額外備註';

  const prompt = [
    '請根據以下資料生成一張美容雜誌風分享圖。',
    `模板方向：${template.name}。`,
    `整體氣氛：${template.tone}。`,
    `構圖重點：${template.composition.join('、')}。`,
    `視覺關鍵字：${template.stylingKeywords.join(', ')}。`,
    '圖片比例：直向 4:5。',
    `標題：${title}。`,
    `文字摘要：${notes}。`,
    `本次使用產品：\n${productList}`,
    template.id === 'product-catalog'
      ? '請優先確保右側產品清單清楚易讀，產品資訊要整齊、優雅、有高級感，像美容編輯整理頁。'
      : '請優先確保臉部旁註位置自然，清楚指出對應妝容部位，像妝容解析筆記。',
    input.selfieUrl
      ? '請保留自拍中的人物特徵與妝容方向，整體做成精緻、自然、可分享的編輯式視覺。'
      : '未提供自拍，請用柔和美容編輯排版呈現產品與妝容主題。',
    '避免過度塑膠感、過度修圖、俗艷濾鏡、雜亂背景與過多裝飾文字。',
  ].join('\n');

  return {
    template,
    prompt,
    summary: {
      title,
      notes,
      productCount: input.selectedProducts.length,
      orientation: template.orientation,
    },
  };
}

export function getMakeupShareOutputSize(templateId: MakeupShareTemplate['id']) {
  getMakeupShareTemplate(templateId);
  return '1024x1536';
}
