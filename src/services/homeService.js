import axiosClient from './axiosClient';

const homeService = {
  // Bạn không cần viết đầy đủ URL, không cần lo về header nữa
  getProducts: () => {
    return axiosClient.get(`products`);
  },
//   addToCart: (item) => {
//     return axiosClient.post('/carts', item);
//   }
};

export default homeService;