import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface AccessLog {
  id: string;
  officer_name: string;
  badge_number: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  documents_viewed: string[];
}

export default function AccessHistory() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {
        const response = await axios.get(`${API_URL}/api/access-log/${userId}`);
        setLogs(response.data);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openMap = (latitude?: number, longitude?: number) => {
    if (latitude && longitude) {
      const url = Platform.select({
        ios: `maps://app?daddr=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
        default: `https://maps.google.com/?q=${latitude},${longitude}`,
      });
      // For web preview, just show an alert
      Alert.alert('Location', `Latitude: ${latitude}\nLongitude: ${longitude}`);
    }
  };

  const generatePDF = async () => {
    setIsExporting(true);
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const userEmail = await AsyncStorage.getItem('user_email');
      const response = await axios.get(`${API_URL}/api/access-log/${userId}/export`);
      const data = response.data;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Secure Stop - Access History Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #007AFF;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #007AFF;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #666;
              margin: 10px 0 0 0;
            }
            .meta {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .meta p {
              margin: 5px 0;
            }
            .log-entry {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 15px;
            }
            .log-header {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .officer-name {
              font-size: 18px;
              font-weight: bold;
              color: #333;
            }
            .badge {
              background: #007AFF;
              color: white;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 14px;
            }
            .log-details {
              color: #666;
              font-size: 14px;
            }
            .log-details p {
              margin: 5px 0;
            }
            .location-link {
              color: #007AFF;
              text-decoration: none;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #888;
              font-size: 12px;
            }
            .no-logs {
              text-align: center;
              padding: 40px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛡️ Secure Stop</h1>
            <p>Access History Report</p>
          </div>
          
          <div class="meta">
            <p><strong>Account:</strong> ${data.user_email}</p>
            <p><strong>Export Date:</strong> ${new Date(data.export_date).toLocaleString()}</p>
            <p><strong>Total Access Records:</strong> ${data.total_accesses}</p>
          </div>

          ${data.logs.length === 0 ? `
            <div class="no-logs">
              <p>No access records found.</p>
            </div>
          ` : data.logs.map((log: any, index: number) => `
            <div class="log-entry">
              <div class="log-header">
                <span class="officer-name">${log.officer_name}</span>
                <span class="badge">Badge: ${log.badge_number}</span>
              </div>
              <div class="log-details">
                <p><strong>Date & Time:</strong> ${new Date(log.timestamp).toLocaleString()}</p>
                ${log.latitude && log.longitude ? `
                  <p><strong>Location:</strong> 
                    <a class="location-link" href="https://maps.google.com/?q=${log.latitude},${log.longitude}">
                      ${log.latitude.toFixed(6)}, ${log.longitude.toFixed(6)}
                    </a>
                  </p>
                ` : '<p><strong>Location:</strong> Not available</p>'}
                <p><strong>Documents Viewed:</strong> ${log.documents_viewed.length > 0 ? log.documents_viewed.length : 'All available'}</p>
              </div>
            </div>
          `).join('')}

          <div class="footer">
            <p>This report was generated by Secure Stop App</p>
            <p>For legal documentation purposes only</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Access History',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', 'PDF created but sharing is not available on this device');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export access history');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Export Button */}
      <TouchableOpacity
        style={styles.exportButton}
        onPress={generatePDF}
        disabled={isExporting || logs.length === 0}
      >
        {isExporting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="download" size={18} color="#fff" />
            <Text style={styles.exportButtonText}>Export PDF</Text>
          </>
        )}
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLogs(); }} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading access history...</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>No Access Records</Text>
            <Text style={styles.emptySubtitle}>
              When officers access your documents in secure mode, their credentials will be logged here
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.totalCount}>{logs.length} access record{logs.length !== 1 ? 's' : ''}</Text>
            
            {logs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.officerInfo}>
                    <Ionicons name="person" size={20} color="#007AFF" />
                    <Text style={styles.officerName}>{log.officer_name}</Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>#{log.badge_number}</Text>
                  </View>
                </View>

                <View style={styles.logDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={16} color="#888" />
                    <Text style={styles.detailText}>{formatDate(log.timestamp)}</Text>
                  </View>

                  {log.latitude && log.longitude ? (
                    <TouchableOpacity
                      style={styles.detailRow}
                      onPress={() => openMap(log.latitude, log.longitude)}
                    >
                      <Ionicons name="location" size={16} color="#34C759" />
                      <Text style={[styles.detailText, styles.locationText]}>
                        {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                      </Text>
                      <Ionicons name="open-outline" size={14} color="#34C759" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color="#888" />
                      <Text style={styles.detailText}>Location not recorded</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Ionicons name="document-text" size={16} color="#888" />
                    <Text style={styles.detailText}>
                      {log.documents_viewed.length > 0 
                        ? `${log.documents_viewed.length} document(s) viewed`
                        : 'All documents accessed'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 20,
    marginBottom: 0,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    padding: 20,
  },
  totalCount: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  officerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  officerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  badgeContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#888',
  },
  locationText: {
    color: '#34C759',
  },
});
