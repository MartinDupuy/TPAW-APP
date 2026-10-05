import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { expressMiddleware } from "@as-integrations/express5";
import { resolvers, typeDefs } from "./schema.js";

dotenv.config();

const port = Number(process.env.PORT) || 4000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Falta la variable de entorno MONGODB_URI.");
}

const app = express();
const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
});

await mongoose.connect(mongoUri);
await apollo.start();

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.get("/", (_req, res) => {
  res.redirect("/graphql");
});

app.use("/graphql", express.json(), expressMiddleware(apollo));

const httpServer = app.listen(port, "0.0.0.0", () => {
  console.log(`GraphQL listo en el puerto ${port}`);
});

async function shutdown() {
  httpServer.close();
  await apollo.stop();
  await mongoose.disconnect();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);