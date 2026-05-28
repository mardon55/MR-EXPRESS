import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, PlusIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { GlassButton } from '@/components/ui/GlassButton'
import { api, type CategoryNode, type ProductRow } from '@/lib/api'
import { ImageUploaderGrid } from './ImageUploaderGrid'
import { CategoryDependentSelect } from './CategoryDependentSelect'
import { RichTextEditor } from './RichTextEditor'
import { cn } from '@/lib/utils'

interface AddProductModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  editProduct?: ProductRow | null
}

type FieldType = 'text' | 'select' | 'multiselect'

interface CatField {
  key: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
}

const CATEGORY_FIELDS: Record<number, CatField[]> = {
  // ── Elektronika parent (fallback) ──
  1: [
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Apple, Samsung, Xiaomi...' },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ['Qora', 'Oq', 'Kumush', "Ko'k", 'Qizil', 'Yashil', 'Sariq', 'Oltin'] },
    { key: 'warranty', label: 'Kafolat', type: 'select', options: ['Kafolatsiz', '1 oy', '6 oy', '1 yil', '2 yil'] },
  ],
  // ── Smartfonlar (16) ──
  16: [
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Apple, Samsung, Xiaomi, Vivo, Realme...' },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ['Qora', 'Oq', 'Kumush', 'Oltin', "Ko'k", 'Yashil', 'Qizil', 'Binafsha'] },
    { key: 'storage', label: 'Xotira (ROM)', type: 'multiselect', options: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    { key: 'ram', label: 'Tezkor xotira (RAM)', type: 'multiselect', options: ['4GB', '6GB', '8GB', '12GB', '16GB'] },
    { key: 'warranty', label: 'Kafolat', type: 'select', options: ['Kafolatsiz', '1 oy', '6 oy', '1 yil', '2 yil'] },
  ],
  // ── Aksessuarlar (17) ──
  17: [
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Baseus, Joyroom, Xiaomi, Borofone, Hoco...' },
    { key: 'type', label: 'Turi', type: 'multiselect', options: ['Avtomobil ushlagichi (Derjatel)', 'Monopod (Sander)', 'Halqa (Ring)', 'Quloqchin', 'Dinamik'] },
    { key: 'connection', label: 'Ulanish turi', type: 'select', options: ['Bluetooth', 'Simli', 'Wireless (Radio)', 'USB', 'Type-C'] },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ['Qora', 'Oq', 'Kulrang', 'Kumush', 'Qizil'] },
  ],
  // ── G'iloflar / Chexollar (18) ──
  18: [
    { key: 'compatible_models', label: 'Mos modellar', type: 'multiselect', options: ['iPhone 11', 'iPhone 13', 'iPhone 14', 'iPhone 14 Pro Max', 'iPhone 15', 'iPhone 15 Pro', 'Samsung S24', 'Samsung A55', 'Redmi Note 13'] },
    { key: 'material', label: 'Material turi', type: 'select', options: ['Silikon', 'Charm (Koja)', 'Plastik', 'Shaffof (Akril)', 'Rezina'] },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ['Qora', 'Shaffof', 'Pushti', "To'q ko'k", 'Yashil', 'Oq', 'Kulrang'] },
    { key: 'type', label: 'Turi', type: 'select', options: ['Oddiy chexol', 'Kitobcha (Kojaniy)', "Cho'ntakli (Karta uchun)", 'MagSafe qo\'llaydigan'] },
  ],
  // ── Himoya oynalari (19) ──
  19: [
    { key: 'compatible_models', label: 'Mos modellar', type: 'multiselect', options: ['iPhone 11', 'iPhone 13', 'iPhone 14', 'iPhone 14 Pro Max', 'iPhone 15', 'iPhone 15 Pro', 'Samsung S24', 'Samsung A55', 'Redmi Note 13'] },
    { key: 'glass_type', label: 'Shisha turi', type: 'select', options: ['2.5D', '3D', '9D', 'Keramika (Yshilmaydigan)', 'Matoviy (Anti-blik)', 'Anti-shpion'] },
    { key: 'thickness', label: 'Qalinligi / Mustahkamligi', type: 'select', options: ['0.33mm', '9H ultra', '0.26mm', '11H'] },
  ],
  // ── Quvvatlagichlar (20) ──
  20: [
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Apple, Anker, Baseus, Hoco, Samsung...' },
    { key: 'type', label: 'Turi', type: 'select', options: ['Adapter (Blok)', 'Kabel (Shnur)', 'Simsiz quvvatlagich (Wireless)', 'Powerbank'] },
    { key: 'wattage', label: 'Quvvat tezligi (Vatt)', type: 'select', options: ['5W', '18W', '20W', '33W', '65W', '100W'] },
    { key: 'port_type', label: 'Port turi', type: 'multiselect', options: ['USB-A', 'Type-C', 'Lightning (iPhone uchun)', 'Micro-USB'] },
    { key: 'cable_length', label: 'Kabel uzunligi', type: 'select', options: ['1 metr', '1.5 metr', '2 metr', '3 metr'] },
  ],
  // ── Kiyimlar parent (fallback) ──
  2: [
    { key: 'sizes', label: "O'lchamlar (Razmer)", type: 'multiselect', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ['Qora', 'Oq', "Ko'k", 'Yashil', 'Qizil', 'Sariq', 'Jigarrang', 'Kulrang', 'Binafsha', 'Pushti'] },
    { key: 'material', label: 'Material (Mato)', type: 'text', placeholder: 'Paxta, Teri, Ipak, Junli...' },
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Nike, Adidas, Zara...' },
  ],
  // ── Erkaklar kiyimi (21) ──
  21: [
    { key: 'clothing_type', label: 'Kiyim turi', type: 'multiselect', options: ['T-shirt (Futbolka)', "Ko'ylak", 'Shim', 'Jinsi', 'Kostyum-shifoner', 'Sviter', 'Kurtka'] },
    { key: 'sizes', label: "O'lchamlar (Razmer)", type: 'multiselect', options: ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '46', '48', '50', '52', '54'] },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ['Qora', "To'q ko'k", 'Kulrang', 'Oq', 'Jigarrang', 'Yashil', 'Qizil', 'Bej'] },
    { key: 'material', label: 'Material (Mato)', type: 'select', options: ['Paxta (Xlopok)', "Zig'ir (Lnyanoy)", 'Jun (Sherst)', 'Sintetika', 'Djinsi', 'Aralash'] },
    { key: 'season', label: 'Mavsum', type: 'select', options: ['Yozgi', 'Bahor/Kuz', 'Qishki', 'Universal'] },
  ],
  // ── Ayollar kiyimi (22) ──
  22: [
    { key: 'clothing_type', label: 'Kiyim turi', type: 'multiselect', options: ["Ko'ylak (Platye)", 'Yubka', 'Bluzka', 'Kostyum', 'Shimlar', 'Tunika', 'Kardigan', 'Nimcha'] },
    { key: 'sizes', label: "O'lchamlar (Razmer)", type: 'multiselect', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '42', '44', '46', '48', '50', '52'] },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ['Pushti', 'Qizil', 'Bej (Tana rangi)', 'Qora', 'Oq', 'Binafsha', 'Sariq', "Ko'k", 'Yashil', 'Kulrang'] },
    { key: 'material', label: 'Material (Mato)', type: 'select', options: ['Ipak (Sholk)', 'Shifon', 'Paxta', 'Trikotaj', 'Velvet', 'Atlas', 'Sintetika'] },
    { key: 'season', label: 'Mavsum', type: 'select', options: ['Yozgi', 'Demisezon (Bahor/Kuz)', 'Qishki', 'Universal'] },
  ],
  // ── Bolalar kiyimi (23) ──
  23: [
    { key: 'clothing_type', label: 'Kiyim turi', type: 'multiselect', options: ['Kombinezon', 'Bodik', 'Futbolka', 'Shimcha', 'Nimcha', 'Sportivka', 'Pidjama'] },
    { key: 'sizes', label: "Yoshi / O'lchami", type: 'multiselect', options: ['0-3 oy', '3-6 oy', '6-12 oy', '1-2 yosh', '3-5 yosh', '6-9 yosh', '10-14 yosh'] },
    { key: 'gender', label: 'Bolaning jinsi', type: 'select', options: ["O'g'il bola uchun", 'Qiz bola uchun', 'Universal (Uniseks)'] },
    { key: 'material', label: 'Material (Mato)', type: 'select', options: ['100% Paxta (Xlopok)', 'Interlok', 'Futro', 'Sintetika'] },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ["Och ko'k", 'Pushti', 'Sariq', 'Oq', 'Yashil', 'Turli xil (Multfilm rasmli)'] },
  ],
  // ── Sport kiyimlari (24) ──
  24: [
    { key: 'clothing_type', label: 'Kiyim turi', type: 'multiselect', options: ['Sport kostyumi (Sportivka)', 'Shorti', 'Masterka', 'Leginsi (Tayt)', 'Sportivniy top', 'Xudi'] },
    { key: 'sizes', label: "O'lchamlar (Razmer)", type: 'multiselect', options: ['S', 'M', 'L', 'XL', 'XXL'] },
    { key: 'feature', label: 'Xususiyati', type: 'multiselect', options: ['Termo (Issiqlik saqlaydigan)', "Cho'ziluvchan (Elastik)", 'Namlikni shimadigan (Dri-FIT)', 'Shamol o\'tkazmaydigan (Windbreaker)'] },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ['Qora', 'Neon yashil', 'Kulrang', "Ko'k", 'Qizil', 'Oq', 'Sariq'] },
    { key: 'gender', label: 'Jinsi', type: 'select', options: ['Erkaklar uchun', 'Ayollar uchun', 'Universal'] },
  ],
  // ── Oyoq kiyimlar / Poyabzallar (25) ──
  25: [
    { key: 'type', label: 'Turi', type: 'select', options: ['Klassik tufli', 'Krossovka', 'Keda', 'Mokasina', 'Etik (Sapogi)', 'Shlyopansi', 'Cheshka'] },
    { key: 'sizes', label: "O'lchamlar (Razmer)", type: 'multiselect', options: ['20', '22', '24', '26', '28', '30', '32', '34', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
    { key: 'material', label: 'Material', type: 'select', options: ["Tabiiy charm (Koja)", "Sun'iy charm", 'Zamsh', 'Mato (Setka)', 'Rezina'] },
    { key: 'gender', label: 'Jinsi', type: 'select', options: ['Erkaklar', 'Ayollar', "Bolalar (O'g'il)", 'Bolalar (Qiz)'] },
    { key: 'season', label: 'Mavsum', type: 'select', options: ['Yozgi (Ochiq)', 'Kuzgi/Bahorgi', "Qishki (Mo'ynali/Mexli)"] },
  ],
  // ── Uy Ro'zg'or parent (fallback) ──
  3: [
    { key: 'material', label: 'Material', type: 'text', placeholder: "Metall, Plastik, Yog'och..." },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ['Qora', 'Oq', 'Kumush', 'Jigarrang', 'Yashil', 'Kulrang', 'Bej'] },
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Brend nomi...' },
    { key: 'dimensions', label: "O'lchamlari", type: 'text', placeholder: '30x40 sm, 1.5 m...' },
  ],
  // ── Oshxona jihozlari (26) ──
  26: [
    { key: 'type', label: 'Turi', type: 'select', options: ['Qozon', 'Tova (Skovoroda)', "Pichoqlar to'plami", 'Idish-tovoqlar', 'Choynak', 'Termos', 'Konteyner', 'Boshqa'] },
    { key: 'material', label: 'Material', type: 'select', options: ['Alyuminiy', 'Granit qoplama', 'Teflon', "Zanglamaydigan po'lat (Nershavayka)", 'Shisha', 'Keramika', "Cho'yan (Chugun)"] },
    { key: 'capacity', label: "Hajmi (Litr / Diametr)", type: 'multiselect', options: ['2L', '3L', '5L', '7L', '20 sm', '24 sm', '28 sm', '32 sm'] },
    { key: 'set_size', label: "Idishlar soni (To'plamlar uchun)", type: 'select', options: ["6 kishilik", "12 kishilik", "18 bo'lakli", "24 bo'lakli", "Alohida"] },
    { key: 'compatibility', label: 'Mosligi', type: 'multiselect', options: ['Gaz plita uchun', 'Induksion plita uchun', "Idish yuvish mashinasiga mos", 'Barcha plitalar uchun'] },
  ],
  // ── Maishiy texnika (27) ──
  27: [
    { key: 'type', label: 'Turi', type: 'select', options: ['Muzlatgich', 'Kir yuvish mashinasi', 'Mikrotolqinli pech (Mikrovolnovka)', 'Changyutgich', 'Blender', "Go'shtmaydalagich", 'Dazmol', 'Boshqa'] },
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Artel, Samsung, LG, Bosch, Avalon...' },
    { key: 'power', label: 'Quvvati (W)', type: 'select', options: ['500W', '700W', '1000W', '1200W', '1500W', '2000W', '2500W'] },
    { key: 'energy_class', label: 'Energiya samaradorligi', type: 'select', options: ['A', 'A+', 'A++', 'A+++', 'B', 'C'] },
    { key: 'capacity', label: "Hajmi / Sig'imi", type: 'text', placeholder: '6 kg, 8 kg / 20L, 23L / 300L, 400L...' },
    { key: 'warranty', label: 'Kafolat', type: 'select', options: ['Kafolatsiz', '6 oy', '1 yil', '2 yil', '3 yil'] },
  ],
  // ── Uy tekstili (28) ──
  28: [
    { key: 'type', label: 'Turi', type: 'select', options: ["Ko'rpa-to'shak komplekti", 'Sochiq (Polotense)', 'Parda', 'Gilam', 'Dasturxon', 'Yostiq', 'Plad (Pled)', 'Boshqa'] },
    { key: 'size', label: "O'lchami", type: 'select', options: ["Bir kishilik (1-spalnyy)", "Ikki kishilik (2-spalnyy)", 'Evro (Euro)', 'Oilaviy (Semeynyy)', '100x150 sm', '150x200 sm', '200x300 sm'] },
    { key: 'material', label: 'Material (Mato)', type: 'select', options: ['100% Paxta (Xlopok)', 'Satin', 'Poplin', 'Maxra (Baxrom)', 'Ipak', 'Mikrofibre', 'Aralash'] },
    { key: 'pattern', label: 'Rang va naqsh', type: 'select', options: ['Bir rangli (Oddiy)', 'Gullik', 'Geometrik naqshli', 'Bolalarbop rasmli', 'Katak', 'Abstrak'] },
  ],
  // ── Mebel va interyer (29) ──
  29: [
    { key: 'type', label: 'Turi', type: 'select', options: ['Divan', 'Kreat', 'Shkaf', "Stol-stul to'plami", 'Oshxona mebeli', 'Oyna (Zerkalo)', 'Devor soati', 'Kartina / rasm', 'Boshqa'] },
    { key: 'room', label: 'Xona turi', type: 'select', options: ['Mehmonxona (Zal)', 'Yotoqxona (Spalnya)', 'Oshxona', 'Doshxona (Prixojaya)', 'Bolalar xonasi', 'Hammom'] },
    { key: 'material', label: 'Material', type: 'select', options: ["Tabiiy yog'och (Derevo)", 'MDF', 'DSP (Laminat)', 'Metall', 'Plastik', 'Shisha'] },
    { key: 'upholstery', label: 'Mebel qoplamasi (Divan/Stullar)', type: 'select', options: ['Velvet', 'Koja (Charm)', 'Jakkard', 'Velur', 'Ekokoja', "Yo'q"] },
    { key: 'dimensions', label: "O'lchamlari (Bo'y × Eni × Chuqurligi)", type: 'text', placeholder: '200 × 90 × 80 sm...' },
  ],
  // ── Go'zallik parent (fallback) ──
  4: [
    { key: 'brand', label: 'Brend', type: 'text', placeholder: "L'Oreal, MAC, Nivea, Chanel..." },
    { key: 'volume', label: 'Hajm/Miqdor', type: 'text', placeholder: '50ml, 100ml, 200g...' },
    { key: 'skin_type', label: 'Teri turi', type: 'multiselect', options: ['Barcha teri', 'Quruq', "Yog'li", 'Normal', 'Aralash', 'Sezgir'] },
  ],
  // ── Yuz va tana parvarishi (30) ──
  30: [
    { key: 'type', label: 'Turi', type: 'select', options: ['Krem', 'Serum (Sivorotka)', 'Tonik', 'Penka / Gel (Yuvinish uchun)', 'Skrab', 'Niqob (Maska)', 'Losyon', 'Boshqa'] },
    { key: 'skin_type', label: 'Teri turi', type: 'multiselect', options: ['Quruq teri', "Yog'li teri", 'Kombinatsiyalangan (Aralash)', 'Nozik (Sezgir)', 'Oddiy teri', 'Barcha teri turlari'] },
    { key: 'purpose', label: 'Vazifasi', type: 'multiselect', options: ['Namlantirish', 'Ajinlarga qarshi (Anti-age)', 'Oqartirish', 'Akne / Husnbuzarga qarshi', 'Quyoshdan himoya (SPF)', 'Tozalovchi'] },
    { key: 'volume', label: 'Hajmi', type: 'select', options: ['15 ml', '30 ml', '50 ml', '100 ml', '150 ml', '200 ml', '500 ml'] },
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'G9skin, Cosrx, The Ordinary, Nivea, Garnier...' },
  ],
  // ── Dekorativ kosmetika / Makiyaj (31) ──
  31: [
    { key: 'type', label: 'Turi', type: 'select', options: ['Tonal krem (Tonalniy)', 'Pomada / Lab gili', 'Tush (Mascara)', 'Podvodka', 'Ten (Ko\'z uchun)', 'Pudra', 'Xaylayter', 'Boshqa'] },
    { key: 'tone', label: 'Tonal krem / Pudra rangi (Ton)', type: 'select', options: ['№21 (Och)', '№23 (Tabiiy bej)', '№25 (To\'q bej)', '№27', '№29 (To\'q)', 'Universal'] },
    { key: 'lipstick_type', label: 'Pomada turi', type: 'select', options: ['Matoviy (Matte)', 'Gilyantsevaya (Yaltiroq)', 'Lab parvarishlovchi (Balzam)', 'Satin'] },
    { key: 'feature', label: 'Xususiyati', type: 'multiselect', options: ['Suvga chidamli (Waterproof)', 'Uzoq muddat saqlanuvchi (Long-lasting)', 'SPF himoya', 'Gipoallergen'] },
    { key: 'brand', label: 'Brend', type: 'text', placeholder: "Maybelline, L'Oreal, MAC, NYX, Kiko, Vivienne Sabo..." },
  ],
  // ── Soch parvarishi (32) ──
  32: [
    { key: 'type', label: 'Turi', type: 'select', options: ['Shampun', 'Balzam / Konditsioner', 'Maska (Niqob)', "Soch moyi (Maslo / Serum)", 'Sprey', "Soch bo'yog'i", 'Boshqa'] },
    { key: 'hair_type', label: 'Soch turi', type: 'multiselect', options: ['Quruq va shikastlangan', "Yog'li", "Bo'yalgan sochlar", "To'kilishga moyil", "Qazg'oqli (Sevoreya)", 'Barcha soch turlari'] },
    { key: 'feature', label: 'Xususiyati', type: 'multiselect', options: ['Sulfatsiz (Sulfate-free)', 'Keratinli', 'Organik', 'Hajm beruvchi (Volume)', 'Tiklash (Rejeneration)'] },
    { key: 'volume', label: 'Hajmi', type: 'select', options: ['100 ml', '150 ml', '250 ml', '400 ml', '500 ml', '1 litr'] },
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'CP-1, Estel, Londa, Elseve, Syoss, Clear, Shiseido...' },
  ],
  // ── Parfyumeriya / Atorlar (33) ──
  33: [
    { key: 'type', label: 'Turi', type: 'select', options: ['Ator (Duxi / Parfum)', 'Parfyum suvi (Eau de Parfum)', 'Tualet suvi (Eau de Toilette)', 'Tana spreyi (Bodyspray)', "Yog'li ator"] },
    { key: 'gender', label: 'Jinsi', type: 'select', options: ['Erkaklar uchun (Male)', 'Ayollar uchun (Female)', 'Uniseks (Universal)'] },
    { key: 'scent_group', label: 'Ifor guruhi (Shleyf)', type: 'select', options: ['Shirin (Sladkiy)', 'Achchiq (Pryanyy)', 'Svejiy (Dengiz / Muz)', 'Sitrusli (Lemon/Apelsin)', "Yog'ochli (Drevniy)", 'Guldor (Floral)'] },
    { key: 'volume', label: 'Hajmi', type: 'select', options: ['3 ml (Yog\'li ator)', '10 ml', '30 ml', '50 ml', '100 ml', '200 ml'] },
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Chanel, Dior, Creed, Tom Ford, Versace, Zara, Ajmal...' },
  ],
  // ── Manikyur va pedikyur (34) ──
  34: [
    { key: 'type', label: 'Turi', type: 'select', options: ['Gel-lak (Shellak)', 'Oddiy lak', 'Lak qurituvchi LED lampa', 'Apparat (Frenzer)', "Piločka (Arra)", 'Praymer', 'Top / Baza', 'Boshqa'] },
    { key: 'color', label: 'Rangi / Nomeri', type: 'text', placeholder: 'Qizil, Neon, Yaltiroq, Fransuz manikyuri...' },
    { key: 'volume', label: 'Hajmi', type: 'select', options: ['5 ml', '8 ml', '10 ml', '12 ml', '15 ml'] },
    { key: 'safety', label: 'Zararsizligi', type: 'multiselect', options: ['9-Free', 'Gipoallergen (Allergiya bermaydigan)', 'Vegan', 'Organik'] },
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'Kodi, Uno, Oxxi, Beautix, Nail Apex...' },
  ],
  5: [
    { key: 'age_range', label: 'Yosh chegarasi', type: 'select', options: ['0-1 yosh', '1-3 yosh', '3-6 yosh', '6-12 yosh', '12+ yosh'] },
    { key: 'material', label: 'Material', type: 'text', placeholder: "Plastik, Yog'och, To'qima..." },
    { key: 'colors', label: 'Ranglar', type: 'multiselect', options: ["Ko'k", 'Qizil', 'Yashil', 'Sariq', 'Pushti', 'Rangli'] },
    { key: 'brand', label: 'Brend', type: 'text', placeholder: 'LEGO, Fisher-Price...' },
  ],
}

const inputClass = cn(
  'frosted-pill w-full px-4 py-3 text-sm font-medium text-ink-800 outline-none',
  'placeholder:text-ink-400 dark:text-ink-100',
)

function MultiSelectField({
  field,
  value,
  onChange,
}: {
  field: CatField
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [custom, setCustom] = useState('')

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  }

  const addCustom = () => {
    const t = custom.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setCustom('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {field.options?.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              'px-3 py-1.5 rounded-2xl text-xs font-semibold border transition-all',
              value.includes(opt)
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'frosted-pill border-white/20 text-ink-600 dark:text-ink-300',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={cn(inputClass, '!py-2 !text-xs flex-1')}
          placeholder="Qo'shimcha qiymat..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
        />
        <button
          type="button"
          onClick={addCustom}
          className="frosted-button !rounded-2xl !px-3 !py-2"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 rounded-xl bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400"
            >
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))}>
                <XCircleIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function formatPreviewPrice(val: string) {
  const n = Number(val)
  if (!val || isNaN(n) || n <= 0) return null
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + " so'm"
}

export function AddProductModal({ open, onClose, onCreated, editProduct }: AddProductModalProps) {
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [allFlat, setAllFlat] = useState<CategoryNode[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [oldPrice, setOldPrice] = useState('')
  const [stock, setStock] = useState('100')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [subcategoryId, setSubcategoryId] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<(File | null)[]>([])
  const [attrValues, setAttrValues] = useState<Record<string, string | string[]>>({})
  const [isFeatured, setIsFeatured] = useState(false)
  const [isDiscount, setIsDiscount] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editProduct

  const activeCatId = (subcategoryId as number) || (categoryId as number) || null
  const catFields: CatField[] = activeCatId ? (CATEGORY_FIELDS[activeCatId] ?? []) : []

  useEffect(() => {
    if (!open) return
    api
      .getCategories()
      .then((res) => {
        setCategories(res.data.items)
        setAllFlat(res.data.flat)
      })
      .catch(() => setError("Kategoriyalarni yuklab bo'lmadi"))
  }, [open])

  useEffect(() => {
    if (!open || !editProduct || allFlat.length === 0) return
    setName(editProduct.name)
    setPrice(String(editProduct.price))
    setOldPrice(editProduct.old_price ? String(editProduct.old_price) : '')
    setStock(String(editProduct.stock))
    setDescription(editProduct.description || '')
    setIsFeatured(!!editProduct.is_featured)
    setIsDiscount(!!editProduct.is_discount)
    setImages([])

    const productCat = allFlat.find((c) => c.id === editProduct.category_id)
    if (productCat?.parent_id) {
      setCategoryId(productCat.parent_id)
      setSubcategoryId(editProduct.category_id)
    } else {
      setCategoryId(editProduct.category_id)
      setSubcategoryId('')
    }

    if (editProduct.attributes && typeof editProduct.attributes === 'object') {
      const attrs: Record<string, string | string[]> = {}
      for (const [k, v] of Object.entries(editProduct.attributes)) {
        if (Array.isArray(v)) attrs[k] = v as string[]
        else if (typeof v === 'string') attrs[k] = v
        else if (v !== null && v !== undefined) attrs[k] = String(v)
      }
      setAttrValues(attrs)
    } else {
      setAttrValues({})
    }
  }, [open, editProduct?.id, allFlat.length])

  useEffect(() => {
    if (!isEditing) setAttrValues({})
  }, [categoryId, subcategoryId, isEditing])

  function reset() {
    setName('')
    setPrice('')
    setOldPrice('')
    setStock('100')
    setCategoryId('')
    setSubcategoryId('')
    setDescription('')
    setImages([])
    setAttrValues({})
    setIsFeatured(false)
    setIsDiscount(false)
    setError(null)
  }

  function setAttr(key: string, val: string | string[]) {
    setAttrValues((prev) => ({ ...prev, [key]: val }))
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const priceNum = Number(price)
    if (!name.trim() || !price || isNaN(priceNum) || priceNum <= 0 || !categoryId) {
      setError("Nom, narx (0 dan katta) va kategoriya majburiy")
      return
    }

    const cleanAttrs: Record<string, string | string[]> = {}
    for (const [k, v] of Object.entries(attrValues)) {
      if (Array.isArray(v) ? v.length > 0 : v.trim())
        cleanAttrs[k] = v
    }

    const form = new FormData()
    form.append('name', name.trim())
    form.append('description', description)
    form.append('price', String(priceNum))
    form.append('stock', String(Number(stock) || 100))
    form.append('category_id', String(categoryId))
    if (subcategoryId) form.append('subcategory_id', String(subcategoryId))
    const oldPriceNum = Number(oldPrice)
    if (oldPrice && !isNaN(oldPriceNum) && oldPriceNum > 0) {
      form.append('old_price', String(oldPriceNum))
    }
    if (Object.keys(cleanAttrs).length > 0)
      form.append('attributes', JSON.stringify(cleanAttrs))
    form.append('is_featured', isFeatured ? '1' : '0')
    form.append('is_discount', isDiscount ? '1' : '0')
    images.forEach((file) => {
      if (file) form.append('images', file)
    })

    setSaving(true)
    try {
      if (isEditing && editProduct) {
        await api.updateProduct(editProduct.id, form)
      } else {
        await api.createProduct(form)
      }
      reset()
      onCreated()
      onClose()
    } catch {
      setError(isEditing ? "Mahsulot yangilanmadi. Tekshiring." : "Mahsulot saqlanmadi. Tekshiring.")
    } finally {
      setSaving(false)
    }
  }

  const pricePreview = formatPreviewPrice(price)
  const oldPricePreview = formatPreviewPrice(oldPrice)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            aria-label="Yopish"
            onClick={handleClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="add-product-title"
            className="frosted-glass-heavy relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 shadow-frost-lg"
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="add-product-title" className="text-xl font-bold text-ink-900 dark:text-white">
                  {isEditing ? `Tahrirlash: ${editProduct?.name}` : 'Yangi mahsulot'}
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  {isEditing ? 'Maydonlarni o\'zgartiring va saqlang' : '6 tagacha rasm, kategoriya, tavsif va xususiyatlar'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="frosted-button !rounded-2xl !p-2"
                aria-label="Modalni yopish"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  Rasmlar (6 ta gacha)
                </label>
                <ImageUploaderGrid files={images} onChange={setImages} />
              </div>

              <CategoryDependentSelect
                categories={categories}
                categoryId={categoryId}
                subcategoryId={subcategoryId}
                onCategoryChange={setCategoryId}
                onSubcategoryChange={setSubcategoryId}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                    Mahsulot nomi
                  </label>
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: iPhone 15 Pro"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                    Ombor miqdori
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                    💰 Joriy narx (so&apos;m) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1290000"
                    required
                  />
                  {pricePreview && (
                    <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      ✓ {pricePreview}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                    🏷 Eski narx — chegirma uchun (ixtiyoriy)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value)}
                    placeholder="1590000"
                  />
                  {oldPricePreview && (
                    <p className="mt-1 text-xs font-semibold text-ink-400 line-through">
                      {oldPricePreview}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsFeatured((v) => !v)}
                  className={cn(
                    'flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all',
                    isFeatured
                      ? 'border-amber-400 bg-amber-400/15 text-amber-600 dark:text-amber-400'
                      : 'frosted-pill border-white/20 text-ink-500',
                  )}
                >
                  ⭐ Tavsiya etilgan
                  {isFeatured && <span className="ml-1 text-xs font-bold text-amber-500">ON</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDiscount((v) => !v)}
                  className={cn(
                    'flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all',
                    isDiscount
                      ? 'border-rose-400 bg-rose-400/15 text-rose-600 dark:text-rose-400'
                      : 'frosted-pill border-white/20 text-ink-500',
                  )}
                >
                  🔥 Aksiya mahsulot
                  {isDiscount && <span className="ml-1 text-xs font-bold text-rose-500">ON</span>}
                </button>
              </div>

              {catFields.length > 0 && (
                <div className="rounded-3xl border border-white/20 bg-white/5 p-4 space-y-4">
                  <p className="text-sm font-semibold text-ink-700 dark:text-ink-300">
                    📋 Kategoriya xususiyatlari
                  </p>
                  {catFields.map((field) => (
                    <div key={field.key}>
                      <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                        {field.label}
                      </label>
                      {field.type === 'text' && (
                        <input
                          className={inputClass}
                          placeholder={field.placeholder}
                          value={(attrValues[field.key] as string) ?? ''}
                          onChange={(e) => setAttr(field.key, e.target.value)}
                        />
                      )}
                      {field.type === 'select' && (
                        <select
                          className={inputClass}
                          value={(attrValues[field.key] as string) ?? ''}
                          onChange={(e) => setAttr(field.key, e.target.value)}
                        >
                          <option value="">Tanlang…</option>
                          {field.options?.map((o) => (
                            <option key={o} value={o} className="bg-ink-900 text-white">
                              {o}
                            </option>
                          ))}
                        </select>
                      )}
                      {field.type === 'multiselect' && (
                        <MultiSelectField
                          field={field}
                          value={(attrValues[field.key] as string[]) ?? []}
                          onChange={(v) => setAttr(field.key, v)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  Tavsif
                </label>
                <RichTextEditor value={description} onChange={setDescription} />
              </div>

              {error && (
                <p className="rounded-2xl bg-accent-rose/15 px-4 py-2 text-sm text-rose-600 dark:text-accent-rose">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <GlassButton type="button" onClick={handleClose}>
                  Bekor qilish
                </GlassButton>
                <GlassButton type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saqlanmoqda…' : isEditing ? 'Yangilash' : 'Saqlash'}
                </GlassButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
