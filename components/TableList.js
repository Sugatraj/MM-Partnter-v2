import React from 'react';
import { FlatList, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

// Table Item Component
const TableItem = ({ table, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.tableCard}
      onPress={onPress}
    >
      <View style={styles.tableInfo}>
        <Text style={styles.tableNumber}>Table {table.table_number}</Text>
        {/* <Text style={styles.tableCapacity}>Code: {table.outlet_code}</Text> */}
      </View>
      <FontAwesome name="chevron-right" size={16} color="#666" />
    </TouchableOpacity>
  );
};

// Table List Component
const TableList = ({ tables, onTablePress }) => {
  if (!tables || tables.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No tables in this section</Text>
        <Text style={styles.emptySubText}>Tap the + button to add tables</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.flatList}
      data={tables}
      renderItem={({ item }) => (
        <TableItem
          table={item}
          onPress={() => onTablePress(item)}
        />
      )}
      keyExtractor={(item) => item.table_id.toString()}
      contentContainerStyle={styles.tablesList}
    />
  );
};

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
    height: '100%',
  },
  tablesList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  tableInfo: {
    flex: 1,
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tableCapacity: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
  },
});

export default TableList; 