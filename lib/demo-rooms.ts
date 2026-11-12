import { type PlantZone, type Reading } from './physics';
const base={rh:[45,55] as [number,number],dp:[10,15] as [number,number],t:[18,25] as [number,number],hz_b:47,hz_min:38};
export const demoRooms=[
 {id:'granulation',name:'Granulasi',description:'Membentuk serbuk menjadi butiran.',source:'Skenario presentasi Granulasi yang direkayasa untuk ilustrasi; bukan pengukuran pabrik.',zone:{...base,code:'A1',name_id:'Granulasi',ahus:['AHU-01','AHU-02','AHU-03']} as PlantZone,initial:{temperature_c:22.8,rh_pct:51.8,dp_pa:14.2,fan_hz:43,quality_code:0,critical_step:false} as Reading},
 {id:'mixing',name:'Mixing',description:'Mencampur bahan agar komposisinya merata.',source:'Skenario mixing ilustratif tambahan; bukan zona dari dataset atau pabrik.',zone:{...base,code:'DEMO-M',name_id:'Mixing',ahus:['DEMO-M1','DEMO-M2']} as PlantZone,initial:{temperature_c:23.1,rh_pct:52.1,dp_pa:14.4,fan_hz:43,quality_code:0,critical_step:false} as Reading},
 {id:'compression',name:'Compression',description:'Memadatkan campuran menjadi tablet.',source:'Skenario presentasi Compression yang direkayasa untuk ilustrasi; bukan pengukuran pabrik.',zone:{...base,code:'A2',name_id:'Compression',ahus:['AHU-04','AHU-05','AHU-06']} as PlantZone,initial:{temperature_c:22.5,rh_pct:51.5,dp_pa:14.0,fan_hz:43,quality_code:0,critical_step:false} as Reading},
];
export type DemoRoom=typeof demoRooms[number];
