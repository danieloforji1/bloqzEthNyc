import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Video } from 'expo-av';
import { captureRef } from 'react-native-view-shot';
import AnimatedStoryCard from './AnimatedStoryCard';
import { TransactionShareData } from './TransactionShareCard';
import * as MediaLibrary from 'expo-media-library';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StoryVideoCreatorProps {
  visible: boolean;
  onClose: () => void;
  transaction?: TransactionShareData;
}

export const StoryVideoCreator: React.FC<StoryVideoCreatorProps> = ({
  visible,
  onClose,
  transaction,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const storyCardRef = useRef<View>(null);
  const videoRef = useRef<Video>(null);

  // Sample transaction data for testing
  const sampleTransaction: TransactionShareData = {
    type: 'swap',
    amount: '5.25',
    tokenSymbol: 'ETH',
    network: 'ethereum',
    to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    hash: '0x1234567890abcdef',
    status: 'success',
    timestamp: Date.now(),
  };

  const currentTransaction = transaction || sampleTransaction;

  const handleCreateStory = async () => {
    if (!storyCardRef.current) return;

    setIsGenerating(true);
    Alert.alert('Creating Story', 'Generating your story video...');

    try {
      // Simulate video generation process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // For now, just capture a screenshot
      const uri = await captureRef(storyCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      Alert.alert(
        'Story Created!',
        'Your story video has been generated successfully.',
        [
          { text: 'Share to Instagram', onPress: () => shareToInstagram(uri) },
          { text: 'Share to TikTok', onPress: () => shareToTikTok(uri) },
          { text: 'Save to Camera Roll', onPress: () => saveToCameraRoll(uri) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Error creating story:', error);
      Alert.alert('Error', 'Failed to create story video. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareToInstagram = (uri: string) => {
    // TODO: Implement Instagram Stories sharing
    Alert.alert('Instagram', 'Sharing to Instagram Stories...');
    console.log('Sharing to Instagram:', uri);
  };

  const shareToTikTok = (uri: string) => {
    // TODO: Implement TikTok Stories sharing
    Alert.alert('TikTok', 'Sharing to TikTok Stories...');
    console.log('Sharing to TikTok:', uri);
  };

  const saveToCameraRoll = async (uri: string) => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to save to camera roll.');
      return;
    }
    try {
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'Story saved to camera roll!');
      console.log('Saving to camera roll:', uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to save to camera roll.');
      console.error('Error saving to camera roll:', error);
    }
  };

  const handleAnimationComplete = () => {
    console.log('Story animation completed!');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Story</Text>
          <TouchableOpacity 
            onPress={handleCreateStory}
            disabled={isGenerating}
            style={[styles.createButton, isGenerating && styles.createButtonDisabled]}
          >
            <Text style={styles.createButtonText}>
              {isGenerating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Story Preview */}
        <View style={styles.previewContainer}>
          <View ref={storyCardRef} style={styles.storyCardWrapper}>
            <AnimatedStoryCard
              transaction={currentTransaction}
              onAnimationComplete={handleAnimationComplete}
              isRecording={isRecording}
            />
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => setIsRecording(!isRecording)}
            style={[styles.controlButton, isRecording && styles.controlButtonActive]}
          >
            <Text style={styles.controlButtonText}>
              {isRecording ? '⏹️ Stop' : '🎬 Record'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.instructions}>
            {isRecording 
              ? 'Recording in progress...' 
              : 'Tap "Create" to generate your story video'
            }
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#666666',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  storyCardWrapper: {
    width: screenWidth,
    height: screenHeight * 0.7,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  controls: {
    padding: 20,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 10,
  },
  controlButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  instructions: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default StoryVideoCreator; 