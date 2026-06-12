export type TrendDirection = "up" | "down";

export interface SparklinePoint {
  value: number;
}

export interface ProductSales {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  orders: number;
  trend: TrendDirection;
  salesChange: number;
  sparkline: SparklinePoint[];
}

export const SALES_PRODUCTS: ProductSales[] = [
  {
    id: "1",
    name: "Samsung galaxy s35",
    brand: "Samsung",
    image: "/placeholder.svg?height=40&width=40",
    price: 32,
    orders: 132,
    trend: "up",
    salesChange: 23,
    sparkline: [
      { value: 40 }, { value: 55 }, { value: 45 }, { value: 70 },
      { value: 60 }, { value: 80 }, { value: 75 }, { value: 95 },
    ],
  },
  {
    id: "2",
    name: "Apple MacBook Pro",
    brand: "Apple",
    image: "/placeholder.svg?height=40&width=40",
    price: 280,
    orders: 116,
    trend: "up",
    salesChange: 10,
    sparkline: [
      { value: 30 }, { value: 45 }, { value: 40 }, { value: 55 },
      { value: 50 }, { value: 65 }, { value: 60 }, { value: 75 },
    ],
  },
  {
    id: "3",
    name: "Sony WH-1000XM4",
    brand: "Sony",
    image: "/placeholder.svg?height=40&width=40",
    price: 120,
    orders: 250,
    trend: "down",
    salesChange: -8,
    sparkline: [
      { value: 90 }, { value: 75 }, { value: 80 }, { value: 60 },
      { value: 70 }, { value: 50 }, { value: 45 }, { value: 40 },
    ],
  },
  {
    id: "4",
    name: "Dell XPS 13",
    brand: "Dell",
    image: "/placeholder.svg?height=40&width=40",
    price: 250,
    orders: 23,
    trend: "up",
    salesChange: 12,
    sparkline: [
      { value: 20 }, { value: 35 }, { value: 30 }, { value: 50 },
      { value: 60 }, { value: 75 }, { value: 85 }, { value: 100 },
    ],
  },
  {
    id: "5",
    name: "Smart band 4",
    brand: "Xiaomi",
    image: "/placeholder.svg?height=40&width=40",
    price: 12,
    orders: 592,
    trend: "down",
    salesChange: 6,
    sparkline: [
      { value: 70 }, { value: 68 }, { value: 65 }, { value: 60 },
      { value: 62 }, { value: 58 }, { value: 55 }, { value: 50 },
    ],
  },
  {
    id: "6",
    name: "iPhone 15 Pro",
    brand: "Apple",
    image: "/placeholder.svg?height=40&width=40",
    price: 999,
    orders: 45,
    trend: "up",
    salesChange: 15,
    sparkline: [
      { value: 40 }, { value: 45 }, { value: 55 }, { value: 60 },
      { value: 75 }, { value: 80 }, { value: 85 }, { value: 95 },
    ],
  },
  {
    id: "7",
    name: "Galaxy Watch 6",
    brand: "Samsung",
    image: "/placeholder.svg?height=40&width=40",
    price: 299,
    orders: 88,
    trend: "up",
    salesChange: 12,
    sparkline: [
      { value: 30 }, { value: 35 }, { value: 45 }, { value: 40 },
      { value: 55 }, { value: 60 }, { value: 65 }, { value: 70 },
    ],
  },
  {
    id: "8",
    name: "Sony A7 IV",
    brand: "Sony",
    image: "/placeholder.svg?height=40&width=40",
    price: 2499,
    orders: 12,
    trend: "down",
    salesChange: -5,
    sparkline: [
      { value: 80 }, { value: 75 }, { value: 70 }, { value: 60 },
      { value: 55 }, { value: 50 }, { value: 45 }, { value: 40 },
    ],
  },
];
