import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BlockchainNetwork, WalletContact } from '../services/wallet.service';
import { apiService } from '../services/api.service';

const WalletContactsScreen: React.FC = () => {
  const router = useRouter();
  // Use the theme system
  const { currentTheme } = useTheme();
  
  // State
  const [contacts, setContacts] = useState<WalletContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Animation values for sparkle effect
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0.8)).current;
  
  // Form state for adding new contact
  const [newContactName, setNewContactName] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newContactNetwork, setNewContactNetwork] = useState<BlockchainNetwork>(BlockchainNetwork.ETHEREUM);
  const [newContactNotes, setNewContactNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load contacts from storage
  useEffect(() => {
    // Initial load with loading indicator
    loadContacts(true);
    
    // Start sparkle animation
    startSparkleAnimation();
    
    // Set up periodic refresh to keep contacts in sync with backend
    const refreshInterval = setInterval(() => {
      // Only refresh if not in the middle of adding/editing
      if (!showAddModal && !isSubmitting) {
        // Background refresh without full loading indicator
        loadContacts(false);
      }
    }, 30000); // Refresh every 30 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [showAddModal, isSubmitting]);
  
  // Sparkle animation function
  const startSparkleAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          }),
          Animated.timing(sparkleScale, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          })
        ]),
        Animated.parallel([
          Animated.timing(sparkleOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          }),
          Animated.timing(sparkleScale, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          })
        ])
      ])
    ).start();
  };

  // Load contacts from backend API
  const loadContacts = async (isInitialLoad = false) => {
    try {
      // Use loading for initial load, syncing for background refreshes
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setSyncing(true);
      }
      
      // Try to get contacts from the backend API
      const response = await apiService.getContacts();
      console.log('👍 response for getContacts', response);
      
      if ((response as any).contacts) {
        // Map backend contacts to our WalletContact format
        const mappedContacts = (response as any).contacts.map((contact: any) => ({
          id: contact.id,
          name: contact.name,
          address: contact.address,
          network: contact.network as BlockchainNetwork,
          notes: contact.notes,
          isFavorite: contact.notes?.includes('#favorite') || false
        }));
        
        setContacts(mappedContacts);
        
        // Also save to local storage as backup
        await AsyncStorage.setItem('walletContacts', JSON.stringify(mappedContacts));
      } else {
        // Fallback to local storage if API fails
        const storedContacts = await AsyncStorage.getItem('walletContacts');
        if (storedContacts) {
          setContacts(JSON.parse(storedContacts));
        }
        
        // Show error only on initial load, not during background sync
        if (isInitialLoad && response.error) {
          console.warn('API Error:', response.error);
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      
      // Fallback to local storage if API fails
      try {
        const storedContacts = await AsyncStorage.getItem('walletContacts');
        if (storedContacts) {
          setContacts(JSON.parse(storedContacts));
        }
      } catch (storageError) {
        console.error('Error loading contacts from storage:', storageError);
        
        // Only show alert on initial load, not during background sync
        if (isInitialLoad) {
          Alert.alert('Error', 'Failed to load contacts');
        }
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setSyncing(false);
      }
    }
  };
  
  // Save contacts to backend API and local storage as backup
  const saveContacts = async (updatedContacts: WalletContact[]) => {
    try {
      // Always save to local storage as a backup
      await AsyncStorage.setItem('walletContacts', JSON.stringify(updatedContacts));
    } catch (error) {
      console.error('Error saving contacts to local storage:', error);
      Alert.alert('Warning', 'Failed to save contacts to local storage. Changes may not persist if the app is closed.');
    }
  };
  
  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.address.toLowerCase().includes(query) ||
      contact.network.toLowerCase().includes(query) ||
      (contact.notes && contact.notes.toLowerCase().includes(query))
    );
  });
  
  // Sort contacts: favorites first, then alphabetically
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Handle adding a new contact
  const handleAddContact = async () => {
    // Validate inputs
    if (!newContactName.trim() || !newContactAddress.trim()) {
      Alert.alert('Error', 'Please enter a name and address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare contact data for API
      const contactData = {
        name: newContactName.trim(),
        address: newContactAddress.trim(),
        network: newContactNetwork,
        notes: newContactNotes.trim() + (newContactNotes.trim() ? '\n' : '') + (newContactNotes.includes('#favorite') ? '' : ''),
      };
      
      // Send to backend API
      const response = await apiService.addContact(contactData);
      console.log('👍 response for addContact', response);
      
      if (response && (response as any).contact) {
        // Create new contact object with data from API response
        const newContact: WalletContact = {
          id: (response as any).contact.id,
          name: (response as any).contact.name,
          address: (response as any).contact.address,
          network: (response as any).contact.network as BlockchainNetwork,
          notes: (response as any).contact.notes,
          isFavorite: (response as any).contact.notes?.includes('#favorite') || false,
        };
        
        // Add to contacts list
        const updatedContacts = [...contacts, newContact];
        setContacts(updatedContacts);
        
        // Save to local storage as backup
        saveContacts(updatedContacts);
        
        // Reset form and close modal
        setNewContactName('');
        setNewContactAddress('');
        setNewContactNetwork(BlockchainNetwork.ETHEREUM);
        setNewContactNotes('');
        setShowAddModal(false);
        
        // Show success message
        Alert.alert('Success', 'Contact added successfully');
      } else {
        // Handle API error
        throw new Error(response.error || 'Failed to add contact');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      Alert.alert('Error', 'Failed to add contact to the server; ' + (error as Error).message + ' Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle toggling favorite status
  const toggleFavorite = async (id: string) => {
    try {
      // Find the contact to update
      const contactToUpdate = contacts.find(contact => contact.id === id);
      if (!contactToUpdate) return;
      
      // Toggle favorite status
      const isFavorite = !contactToUpdate.isFavorite;
      
      // Update notes to include or remove #favorite tag
      let updatedNotes = contactToUpdate.notes || '';
      if (isFavorite && !updatedNotes.includes('#favorite')) {
        updatedNotes = updatedNotes.trim() + (updatedNotes.trim() ? '\n' : '') + '#favorite';
      } else if (!isFavorite && updatedNotes.includes('#favorite')) {
        updatedNotes = updatedNotes.replace('#favorite', '').trim();
      }
      
      // Update in the backend
      const response = await apiService.updateContact(id, {
        notes: updatedNotes
      });
      
      if (response.success) {
        // Update local state
        const updatedContacts = contacts.map(contact => {
          if (contact.id === id) {
            return {
              ...contact,
              isFavorite,
              notes: updatedNotes
            };
          }
          return contact;
        });
        
        // Update state and local storage backup
        setContacts(updatedContacts);
        saveContacts(updatedContacts);
      } else {
        throw new Error(response.error || 'Failed to update contact');
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      Alert.alert('Error', 'Failed to update contact. Please try again.');
    }
  };
  
  // Handle deleting a contact
  const handleDeleteContact = (id: string) => {
    // Show confirmation dialog
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from backend API
              const response = await apiService.deleteContact(id);
              console.log('👍 response for deleteContact', response);
              
              if (response.message === 'Contact deleted successfully') {
                // Filter out the contact to delete
                const updatedContacts = contacts.filter(contact => contact.id !== id);
                
                // Update state and local storage backup
                setContacts(updatedContacts);
                saveContacts(updatedContacts);
              } else {
                throw new Error(response.error || 'Failed to delete contact');
              }
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact from the server. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  // Render a contact item
  const renderContactItem = ({ item }: { item: WalletContact }) => (
    <View style={[styles.contactItem, { backgroundColor: currentTheme.cardBackground }]}>
      <View style={styles.contactDetails}>
        <View style={styles.contactHeader}>
          <Text style={[styles.contactName, { color: currentTheme.textPrimary }]}>
            {item.name}
          </Text>
        </View>
        
        <Text style={[styles.contactNetwork, { color: currentTheme.accent }]}>
          {item.network}
        </Text>
        
        <Text 
          style={[styles.contactAddress, { color: currentTheme.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {item.address}
        </Text>
        
        {item.notes && (
          <Text style={[styles.contactNotes, { color: currentTheme.textSecondary }]}>
            {item.notes}
          </Text>
        )}
      </View>
      
      <View style={styles.contactActionsRow}>
        <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
          <Text style={[styles.favoriteIcon, { color: item.isFavorite ? '#FFD700' : currentTheme.textSecondary }]}>
            ★
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.deleteButtonSmall, { backgroundColor: currentTheme.error }]}
          onPress={() => handleDeleteContact(item.id)}
        >
          <Text style={styles.deleteButtonTextSmall}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Network selection options
  const networkOptions = Object.values(BlockchainNetwork);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.topSpacer} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={[styles.backButton, { color: currentTheme.textPrimary }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.textPrimary }]}>Wallet Contacts</Text>
          {syncing && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
              <ActivityIndicator size="small" color={currentTheme.primary} />
              <Text style={{ color: currentTheme.textSecondary, fontSize: 12, marginLeft: 5 }}>Syncing...</Text>
            </View>
          )}
        </View>
        
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: currentTheme.cardBackground,
            color: currentTheme.textPrimary,
            borderColor: currentTheme.secondary
          }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search contacts..."
          placeholderTextColor={currentTheme.textSecondary}
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
        </View>
      ) : (
        <>
          {contacts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                No contacts yet. Add your first wallet contact!
              </Text>
            </View>
          ) : (
            <FlatList
              data={sortedContacts}
              renderItem={renderContactItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </>
      )}
      
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: currentTheme.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        {/* Sparkle effect */}
        <Animated.View 
          style={[
            styles.sparkleContainer,
            {
              opacity: sparkleOpacity,
              transform: [{ scale: sparkleScale }]
            }
          ]}
        >
          <Text style={styles.sparkleText}>✨</Text>
        </Animated.View>
        
        <Text style={styles.addButtonText}>+ Add Contact</Text>
      </TouchableOpacity>
      
      {/* Add Contact Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.background }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
              Add New Contact
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: currentTheme.cardBackground,
                  color: currentTheme.textPrimary,
                  borderColor: currentTheme.secondary
                }]}
                value={newContactName}
                onChangeText={setNewContactName}
                placeholder="Contact name"
                placeholderTextColor={currentTheme.textSecondary}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Wallet Address *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: currentTheme.cardBackground,
                  color: currentTheme.textPrimary,
                  borderColor: currentTheme.secondary
                }]}
                value={newContactAddress}
                onChangeText={setNewContactAddress}
                placeholder="0x..."
                placeholderTextColor={currentTheme.textSecondary}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Network</Text>
              <View style={styles.networkOptions}>
                {networkOptions.map((network) => (
                  <TouchableOpacity
                    key={network}
                    style={[
                      styles.networkOption,
                      { 
                        backgroundColor: newContactNetwork === network 
                          ? currentTheme.primary 
                          : currentTheme.cardBackground,
                        borderColor: currentTheme.secondary
                      }
                    ]}
                    onPress={() => setNewContactNetwork(network)}
                  >
                    <Text style={[
                      styles.networkOptionText,
                      { color: newContactNetwork === network ? 'white' : currentTheme.textPrimary }
                    ]}>
                      {network}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: currentTheme.textPrimary }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: currentTheme.cardBackground,
                  color: currentTheme.textPrimary,
                  borderColor: currentTheme.secondary
                }]}
                value={newContactNotes}
                onChangeText={setNewContactNotes}
                placeholder="Add notes about this contact..."
                placeholderTextColor={currentTheme.textSecondary}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: currentTheme.secondary }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: currentTheme.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  { backgroundColor: currentTheme.primary },
                  isSubmitting && styles.disabledButton
                ]}
                onPress={handleAddContact}
                disabled={isSubmitting || !newContactName || !newContactAddress}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Contact</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.bottomSpacer} />
    </SafeAreaView>
  );
};

// Theme definitions are now handled by ThemeProvider

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSpacer: {
    height: 40,
  },
  bottomSpacer: {
    height: 30,
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  backButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  contactItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactDetails: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  favoriteIcon: {
    fontSize: 24,
  },
  contactNetwork: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactAddress: {
    fontSize: 14,
    marginBottom: 8,
  },
  contactNotes: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  contactActions: {
    justifyContent: 'center',
  },
  contactActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 12,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 48,
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  deleteButtonTextSmall: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sparkleContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  sparkleText: {
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  networkOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  networkOption: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
  },
  networkOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

// Wrap the component with ThemeProvider
const WrappedWalletContactsScreen: React.FC = () => {
  return (
    <ThemeProvider>
      <WalletContactsScreen />
    </ThemeProvider>
  );
};

export default WrappedWalletContactsScreen;
