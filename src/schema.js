import { GraphQLError } from "graphql";
import mongoose from "mongoose";
import Product from "./models/Product.js";

export const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String!
    price: Float!
    stock: Int!
    category: String!
    description: String!
  }

  input ProductFilter {
    search: String
    category: String
    minPrice: Float
    maxPrice: Float
    inStock: Boolean
  }

  input UpdateProductInput {
    name: String
    price: Float
    stock: Int
    category: String
    description: String
  }

  type Query {
    products(filter: ProductFilter): [Product!]!
    product(id: ID!): Product
  }

  type Mutation {
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
  }
`;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const resolvers = {
  Product: {
    id: (product) => product._id.toString()
  },
  Query: {
    products: async (_parent, { filter = {} }) => {
      const mongoFilter = {};

      if (filter.search?.trim()) {
        const search = new RegExp(escapeRegex(filter.search.trim()), "i");
        mongoFilter.$or = [{ name: search }, { description: search }, { category: search }];
      }
      if (filter.category?.trim()) {
        mongoFilter.category = new RegExp(`^${escapeRegex(filter.category.trim())}$`, "i");
      }
      if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
        mongoFilter.price = {};
        if (filter.minPrice !== undefined) mongoFilter.price.$gte = filter.minPrice;
        if (filter.maxPrice !== undefined) mongoFilter.price.$lte = filter.maxPrice;
      }
      if (filter.inStock === true) mongoFilter.stock = { $gt: 0 };
      if (filter.inStock === false) mongoFilter.stock = 0;

      if (
        filter.minPrice !== undefined &&
        filter.maxPrice !== undefined &&
        filter.minPrice > filter.maxPrice
      ) {
        throw new GraphQLError("minPrice no puede ser mayor que maxPrice.", {
          extensions: { code: "BAD_USER_INPUT" }
        });
      }

      return Product.find(mongoFilter).sort({ name: 1 }).exec();
    },
    product: async (_parent, { id }) => {
      if (!mongoose.isValidObjectId(id)) {
        throw new GraphQLError("El id del producto no es válido.", {
          extensions: { code: "BAD_USER_INPUT" }
        });
      }
      return Product.findById(id).exec();
    }
  },
  Mutation: {
    updateProduct: async (_parent, { id, input }) => {
      if (!mongoose.isValidObjectId(id)) {
        throw new GraphQLError("El id del producto no es válido.", {
          extensions: { code: "BAD_USER_INPUT" }
        });
      }
      if (Object.keys(input).length === 0) {
        throw new GraphQLError("Debes indicar al menos un campo para actualizar.", {
          extensions: { code: "BAD_USER_INPUT" }
        });
      }

      const product = await Product.findByIdAndUpdate(id, input, {
        new: true,
        runValidators: true
      }).exec();

      if (!product) {
        throw new GraphQLError("No se encontró el producto.", {
          extensions: { code: "NOT_FOUND" }
        });
      }
      return product;
    }
  }
};