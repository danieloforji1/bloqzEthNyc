import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface MarketMover {
  name: string;
  symbol: string;
  price: number;
  change: number;
}

export default function MarketMoversCard({ movers, title = "Top Gainers" }: { movers: MarketMover[]; title?: string }) {
  if (!movers || movers.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.header}>{title}</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.col, styles.rankCol]}>#</Text>
        <Text style={[styles.col, styles.nameCol]}>Token</Text>
        <Text style={[styles.col, styles.priceCol]}>Price</Text>
        <Text style={[styles.col, styles.changeCol]}>24h %</Text>
      </View>
      {movers.map((coin, idx) => (
        <View key={coin.symbol + idx} style={styles.row}>
          <Text style={[styles.col, styles.rankCol]}>{idx + 1}.</Text>
          <Text style={[styles.col, styles.nameCol]}>{coin.name} ({coin.symbol.toUpperCase()})</Text>
          <Text style={[styles.col, styles.priceCol]}>${coin.price.toFixed(2)}</Text>
          <Text style={[styles.col, styles.changeCol, { color: coin.change > 0 ? '#2ecc40' : '#ff4136', fontWeight: 'bold' }]}> {coin.change > 0 ? '+' : ''}{coin.change.toFixed(2)}% </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#181A20',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  col: {
    fontSize: 15,
    color: '#fff',
  },
  rankCol: {
    width: 28,
    fontWeight: 'bold',
    color: '#8A2BE2',
  },
  nameCol: {
    flex: 1.5,
    fontWeight: '600',
    color: '#fff',
  },
  priceCol: {
    flex: 1,
    textAlign: 'right',
    color: '#FFD700',
    fontWeight: '600',
  },
  changeCol: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
  },
}); 