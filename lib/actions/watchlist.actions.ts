"use server";

import { revalidatePath } from "next/cache";
import { auth } from "../better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";
import { success } from "better-auth";
import { getStocksDetails } from "./finnhub.actions";   

export async function getWatchlistSymbolsByEmail(
  email: string,
): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    // Better Auth stores users in the "user" collection
    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error("getWatchlistSymbolsByEmail error:", err);
    return [];
  }
}

export const addToWatchlist = async (symbol: string, company: string) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/login");

    const checkExisting = await Watchlist.findOne({
      userId: session.user.id,
      symbol,
    });
    if (checkExisting) {
      console.log("Symbol already in watchlist:", symbol);
      return { success: true, message: "Symbol already in watchlist" };
    }

    const newItem = new Watchlist({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company: company.trim(),
      addedAt: new Date(),
    });
    await newItem.save();
    revalidatePath("/watchlist");
    return { success: true, message: "Symbol added to watchlist" };
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    return { success: false, message: "Error adding to watchlist" };
  }
};

export const removeFromWatchlist = async (symbol: string) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");

    const result = await Watchlist.deleteOne({
      userId: session.user.id,
      symbol:symbol.toUpperCase(),
    });
    revalidatePath("/watchlist");
    return { success: true, message: "Symbol removed from watchlist" };
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    return { success: false, message: "Error removing from watchlist" };
  }
};

// Get user's watchlist
export const getUserWatchlist = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect('/sign-in');

    const watchlist = await Watchlist.find({ userId: session.user.id })
      .sort({ addedAt: -1 })
      .lean();

    return JSON.parse(JSON.stringify(watchlist));
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    throw new Error('Failed to fetch watchlist');
  }
}

// Get user's watchlist with stock data
export const getWatchlistWithData = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) redirect('/sign-in');

    const watchlist = await Watchlist.find({ userId: session.user.id }).sort({ addedAt: -1 }).lean();

    if (watchlist.length === 0) return [];

    const stocksWithData = await Promise.all(
      watchlist.map(async (item) => {
        const stockData = await getStocksDetails(item.symbol);

        if (!stockData) {
          console.warn(`Failed to fetch data for ${item.symbol}`);
          return item;
        }

        return {
          company: stockData.company,
          symbol: stockData.symbol,
          currentPrice: stockData.currentPrice,
          priceFormatted: stockData.priceFormatted,
          changeFormatted: stockData.changeFormatted,
          changePercent: stockData.changePercent,
          marketCap: stockData.marketCapFormatted,
          peRatio: stockData.peRatio,
        };
      }),
    );

    return JSON.parse(JSON.stringify(stocksWithData));
  } catch (error) {
    console.error('Error loading watchlist:', error);
    throw new Error('Failed to fetch watchlist');
  }
};