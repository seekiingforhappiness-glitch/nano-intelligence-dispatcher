export interface FallbackLocation {
  province: string;
  city: string;
  district?: string;
  keywords: string[];
  coordinates: {
    lng: number;
    lat: number;
  };
}

export const fallbackLocations: FallbackLocation[] = [
  {
    province: '江苏省',
    city: '南京市',
    district: '江宁区',
    keywords: ['南京江宁', '江宁区', '江宁开发区'],
    coordinates: { lng: 118.839, lat: 31.953 },
  },
  {
    province: '江苏省',
    city: '南京市',
    district: '栖霞区',
    keywords: ['南京栖霞', '栖霞区', '仙林'],
    coordinates: { lng: 118.907, lat: 32.123 },
  },
  {
    province: '江苏省',
    city: '南京市',
    keywords: ['南京市', '南京'],
    coordinates: { lng: 118.796, lat: 32.059 },
  },
  {
    province: '江苏省',
    city: '苏州市',
    district: '昆山市',
    keywords: ['昆山', '昆山市'],
    coordinates: { lng: 120.982, lat: 31.388 },
  },
  {
    province: '江苏省',
    city: '苏州市',
    district: '太仓市',
    keywords: ['太仓', '太仓市'],
    coordinates: { lng: 121.130, lat: 31.459 },
  },
  {
    province: '江苏省',
    city: '苏州市',
    district: '常熟市',
    keywords: ['常熟', '常熟市'],
    coordinates: { lng: 120.752, lat: 31.654 },
  },
  {
    province: '江苏省',
    city: '苏州市',
    district: '张家港市',
    keywords: ['张家港', '张家港市'],
    coordinates: { lng: 120.553, lat: 31.870 },
  },
  {
    province: '江苏省',
    city: '苏州市',
    keywords: ['苏州市', '苏州工业园', '苏州高新区', '苏州'],
    coordinates: { lng: 120.619, lat: 31.299 },
  },
  {
    province: '江苏省',
    city: '无锡市',
    keywords: ['无锡', '锡山区', '江阴', '宜兴'],
    coordinates: { lng: 120.312, lat: 31.492 },
  },
  {
    province: '江苏省',
    city: '常州市',
    keywords: ['常州', '武进', '金坛', '溧阳'],
    coordinates: { lng: 119.974, lat: 31.810 },
  },
  {
    province: '江苏省',
    city: '南通市',
    keywords: ['南通', '通州区', '如皋', '海门', '启东'],
    coordinates: { lng: 120.894, lat: 31.981 },
  },
  {
    province: '江苏省',
    city: '扬州市',
    keywords: ['扬州', '江都', '邗江'],
    coordinates: { lng: 119.414, lat: 32.393 },
  },
  {
    province: '江苏省',
    city: '镇江市',
    keywords: ['镇江', '丹阳', '扬中', '句容'],
    coordinates: { lng: 119.452, lat: 32.204 },
  },
  {
    province: '江苏省',
    city: '泰州市',
    keywords: ['泰州', '靖江', '泰兴', '姜堰'],
    coordinates: { lng: 119.925, lat: 32.455 },
  },
  {
    province: '江苏省',
    city: '盐城市',
    keywords: ['盐城', '大丰', '东台', '射阳'],
    coordinates: { lng: 120.160, lat: 33.349 },
  },
  {
    province: '江苏省',
    city: '淮安市',
    keywords: ['淮安', '清河', '涟水'],
    coordinates: { lng: 119.020, lat: 33.597 },
  },
  {
    province: '江苏省',
    city: '连云港市',
    keywords: ['连云港', '赣榆', '灌云'],
    coordinates: { lng: 119.222, lat: 34.599 },
  },
  {
    province: '江苏省',
    city: '徐州市',
    keywords: ['徐州', '邳州', '新沂'],
    coordinates: { lng: 117.183, lat: 34.266 },
  },
  {
    province: '江苏省',
    city: '宿迁市',
    keywords: ['宿迁', '宿豫', '泗洪'],
    coordinates: { lng: 118.275, lat: 33.963 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '浦东新区',
    keywords: ['浦东新区', '浦东', '张江', '川沙'],
    coordinates: { lng: 121.544, lat: 31.221 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '闵行区',
    keywords: ['闵行区', '闵行', '莘庄'],
    coordinates: { lng: 121.382, lat: 31.113 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '嘉定区',
    keywords: ['嘉定区', '嘉定', '安亭'],
    coordinates: { lng: 121.260, lat: 31.383 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '宝山区',
    keywords: ['宝山区', '宝山'],
    coordinates: { lng: 121.492, lat: 31.409 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '松江区',
    keywords: ['松江区', '松江', '佘山'],
    coordinates: { lng: 121.227, lat: 31.032 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '青浦区',
    keywords: ['青浦区', '青浦', '徐泾'],
    coordinates: { lng: 121.125, lat: 31.150 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '奉贤区',
    keywords: ['奉贤区', '奉贤', '金海'],
    coordinates: { lng: 121.474, lat: 30.918 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '金山区',
    keywords: ['金山区', '金山'],
    coordinates: { lng: 121.341, lat: 30.744 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '崇明区',
    keywords: ['崇明区', '崇明', '长兴岛'],
    coordinates: { lng: 121.540, lat: 31.630 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '徐汇区',
    keywords: ['徐汇区', '徐汇'],
    coordinates: { lng: 121.436, lat: 31.188 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '黄浦区',
    keywords: ['黄浦区', '黄浦', '外滩'],
    coordinates: { lng: 121.486, lat: 31.231 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '静安区',
    keywords: ['静安区', '静安'],
    coordinates: { lng: 121.454, lat: 31.228 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '虹口区',
    keywords: ['虹口区', '虹口'],
    coordinates: { lng: 121.481, lat: 31.277 },
  },
  {
    province: '上海市',
    city: '上海市',
    district: '杨浦区',
    keywords: ['杨浦区', '杨浦'],
    coordinates: { lng: 121.526, lat: 31.259 },
  },
  {
    province: '上海市',
    city: '上海市',
    keywords: ['上海市', '上海'],
    coordinates: { lng: 121.473, lat: 31.230 },
  },
];


