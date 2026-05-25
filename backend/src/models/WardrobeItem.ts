import { Schema, model, Document, Types } from 'mongoose';

export type Category = 'tops' | 'bottoms' | 'outerwear' | 'dresses' | 'shoes' | 'accessories';
export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all';

export interface IWardrobeItem extends Document {
  userId: Types.ObjectId;
  name: string;
  category: Category;
  // Legacy fields
  color: string;
  brand: string;
  imageUrl: string;
  season: Season[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  // Core AI fields (all categories)
  subcategory: string;
  primaryColor: string;
  secondaryColors: string[];
  colorTemperature: string;
  colorIntensity: string;
  pattern: string;
  material: string;
  texture: string;
  transparency: string;
  printType: string;
  gender: string;
  formality: number;
  occasion: string[];
  style: string[];
  aiConfidence: number;
  aiAnalysis: Record<string, unknown>;
  // Tops / Dresses fields
  fit: string;
  sleeveLength: string;
  sleeveStyle: string;
  neckline: string;
  collarType: string;
  cuffStyle: string;
  length: string;
  hemStyle: string;
  closureType: string;
  backDetail: string;
  strapStyle: string;
  // Bottoms fields
  rise: string;
  pleatStyle: string;
  distressing: string;
  waistbandStyle: string;
  legOpening: string;
  // Outerwear fields
  warmthLevel: string;
  waterResistance: string;
  hood: string;
  pockets: string;
  // Dresses fields
  silhouette: string;
  // Shoes fields
  heelHeight: string;
  heelStyle: string;
  toeStyle: string;
  soleType: string;
  shaftHeight: string;
  // Accessories fields
  accessoryType: string;
  bandWidth: string;
  sockHeight: string;
  necklaceLength: string;
  hatStyle: string;
  earringStyle: string;
  tieStyle: string;
  watchStyle: string;
  lensColor: string;
  // Storage
  lining: string;
  publicId: string;
  embedding: number[];
}

const wardrobeItemSchema = new Schema<IWardrobeItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    category: { type: String, enum: ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'], required: true },
    // Legacy
    color: { type: String, default: '' },
    brand: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    season: { type: [String], enum: ['spring', 'summer', 'fall', 'winter', 'all'], default: ['all'] },
    tags: { type: [String], default: [] },
    // Core AI fields
    subcategory: { type: String, default: '' },
    primaryColor: { type: String, default: '' },
    secondaryColors: { type: [String], default: [] },
    colorTemperature: { type: String, default: '' },
    colorIntensity: { type: String, default: '' },
    pattern: { type: String, default: '' },
    material: { type: String, default: '' },
    texture: { type: String, default: '' },
    transparency: { type: String, default: '' },
    printType: { type: String, default: '' },
    gender: { type: String, default: '' },
    formality: { type: Number, default: null },
    occasion: { type: [String], default: [] },
    style: { type: [String], default: [] },
    aiConfidence: { type: Number, default: null },
    aiAnalysis: { type: Schema.Types.Mixed, default: {} },
    // Tops / General
    fit: { type: String, default: '' },
    sleeveLength: { type: String, default: '' },
    sleeveStyle: { type: String, default: '' },
    neckline: { type: String, default: '' },
    collarType: { type: String, default: '' },
    cuffStyle: { type: String, default: '' },
    length: { type: String, default: '' },
    hemStyle: { type: String, default: '' },
    closureType: { type: String, default: '' },
    backDetail: { type: String, default: '' },
    strapStyle: { type: String, default: '' },
    // Bottoms
    rise: { type: String, default: '' },
    pleatStyle: { type: String, default: '' },
    distressing: { type: String, default: '' },
    waistbandStyle: { type: String, default: '' },
    legOpening: { type: String, default: '' },
    // Outerwear
    warmthLevel: { type: String, default: '' },
    waterResistance: { type: String, default: '' },
    hood: { type: String, default: '' },
    pockets: { type: String, default: '' },
    // Dresses
    silhouette: { type: String, default: '' },
    // Shoes
    heelHeight: { type: String, default: '' },
    heelStyle: { type: String, default: '' },
    toeStyle: { type: String, default: '' },
    soleType: { type: String, default: '' },
    shaftHeight: { type: String, default: '' },
    // Accessories
    accessoryType: { type: String, default: '' },
    bandWidth: { type: String, default: '' },
    sockHeight: { type: String, default: '' },
    necklaceLength: { type: String, default: '' },
    hatStyle: { type: String, default: '' },
    earringStyle: { type: String, default: '' },
    tieStyle: { type: String, default: '' },
    watchStyle: { type: String, default: '' },
    lensColor: { type: String, default: '' },
    // Storage
    lining: { type: String, default: '' },
    publicId: { type: String, default: '' },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

export default model<IWardrobeItem>('WardrobeItem', wardrobeItemSchema);
