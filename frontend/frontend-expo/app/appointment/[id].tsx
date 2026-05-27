import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { auth, db } from '@/api/firebase';
import { isV13Summary, isV14Summary, type AppointmentWithId, type ProcessedSummaryV12, type ProcessedSummaryV13, type ProcessedSummaryV14 } from '@/api/appointments';
import { analyticsEvents } from '@/api/analytics';
import { formatAppointmentDate, formatAppointmentDateLong } from '@/utils/formatDate';
import { DeleteAppointmentButton } from '@/components/shared/DeleteAppointmentButton';
import { GuestDisclaimer } from '@/components/shared/GuestDisclaimer';
import { Colors } from '@/constants/Colors';
import { AppointmentSummaryV12 } from '@/components/pages/summary1-2';
import { AppointmentSummaryV13, AppointmentSummaryV14 } from '@/components/pages/summary1-3';
import { downloadAppointmentPdf } from '@/utils/generateAppointmentPdf';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  const { isDesktop } = useResponsiveLayout();

  const [appointment, setAppointment] = useState<AppointmentWithId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const isDeletingRef = useRef(false);

  // Real-time listener
  useEffect(() => {
    if (authLoading) return;
    if (!id) {
      setError('Invalid appointment ID');
      setIsLoading(false);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const appointmentRef = doc(db, 'users', currentUser.uid, 'appointments', id);
    const unsubscribe = onSnapshot(
      appointmentRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          if (isDeletingRef.current) {
            router.replace('/(tabs)/appointments' as any);
            return;
          }
          setError('Appointment not found');
          setIsLoading(false);
          return;
        }

        const data = docSnap.data();
        if (!data.appointmentDate) {
          setError('Appointment data is incomplete');
          setIsLoading(false);
          return;
        }

        const updated: AppointmentWithId = {
          appointmentId: id,
          status: data.status || 'InProgress',
          appointmentDate: data.appointmentDate?.toDate ? data.appointmentDate.toDate().toISOString() : (typeof data.appointmentDate === 'string' ? data.appointmentDate : typeof data.appointmentDate?.seconds === 'number' ? new Date(data.appointmentDate.seconds * 1000).toISOString() : new Date().toISOString()),
          title: data.title,
          doctor: data.doctor,
          location: data.location,
          processedSummary: data.processedSummary,
          rawTranscript: data.rawTranscript,
          recordingLink: data.recordingLink,
          error: data.error,
        };

        setAppointment(updated);
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to listen to appointment:', err);
        setError(err instanceof Error ? err.message : 'Failed to load appointment');
        setIsLoading(false);
      },
    );

    analyticsEvents.viewAppointmentDetail(id);
    return () => unsubscribe();
  }, [id, user, authLoading]);

  // Helpers
  const getAppointmentTitle = (): string => {
    if (!appointment) return 'Appointment Details';
    if (appointment.title) return appointment.title;
    if (appointment.doctor) return appointment.doctor;
    if (appointment.location) return `Appointment at ${appointment.location}`;
    return 'Appointment Details';
  };

  const navigateBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/appointments' as any);
    }
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!appointment || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadAppointmentPdf(appointment);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [appointment, isDownloading]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading appointment...</Text>
      </View>
    );
  }

  // Error / not found state
  if (error || !appointment || appointment.status === 'Error') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {getAppointmentTitle()}
            </Text>
            <Text style={styles.headerDate}>
              {(appointment && formatAppointmentDate(appointment.appointmentDate)) || formatAppointmentDateLong(new Date().toString())}
            </Text>
          </View>
        </View>

        <GuestDisclaimer />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.innerContent, isDesktop && styles.innerContentDesktop]}>
            <View style={styles.notFoundInline}>
              <Ionicons name="alert-circle" size={32} color={Colors.red[600]} />
              <Text style={styles.notFoundTitle}>No appointment details found</Text>
            </View>

            <View style={styles.reasonCard}>
              <Text style={styles.reasonLabel}>Reason</Text>
              <Text style={styles.reasonText}>
                {(appointment as any)?.error || 'We encountered an error while processing this appointment.'}
              </Text>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.detailsHeading}>Appointment Info</Text>
              <View style={styles.detailsList}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {(appointment && formatAppointmentDateLong(appointment.appointmentDate)) || formatAppointmentDateLong(new Date().toString())}
                  </Text>
                </View>
                {appointment?.title && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Title</Text>
                    <Text style={styles.detailValue}>{appointment.title}</Text>
                  </View>
                )}
                {appointment?.doctor && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Doctor</Text>
                    <Text style={styles.detailValue}>{appointment.doctor}</Text>
                  </View>
                )}
                {appointment?.location && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{appointment.location}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.feedbackButton} onPress={() => console.log('Feedback')} activeOpacity={0.7}>
                <Ionicons name="chatbox-outline" size={18} color={Colors.primaryForeground} />
                <Text style={styles.feedbackButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
              <DeleteAppointmentButton appointmentId={id!} onDeleteStart={() => { isDeletingRef.current = true; }} onDeleteError={setError} style={{ flex: 1 }} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // InProgress state
  if (appointment.status === 'InProgress') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{getAppointmentTitle()}</Text>
            <Text style={styles.headerDate}>{formatAppointmentDate(appointment.appointmentDate)}</Text>
          </View>
        </View>

        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.processingTitle}>Processing Appointment</Text>
          <Text style={styles.processingSubtitle}>Please wait while we process your appointment...</Text>
        </View>

        <View style={styles.processingBottomActions}>
          <DeleteAppointmentButton appointmentId={appointment.appointmentId} onDeleteStart={() => { isDeletingRef.current = true; }} onDeleteError={setError} style={{ width: '100%' }} />
        </View>
      </View>
    );
  }

  // Completed state — version-based rendering
  const ps = appointment.processedSummary;
  const isV14 = isV14Summary(ps);
  const isV13 = !isV14 && isV13Summary(ps);

  const hasSummaryContent = (() => {
    if (!ps) return false;
    if (isV14) {
      const v14 = ps as ProcessedSummaryV14;
      return !!(v14.summary || v14.reason_for_visit?.length || v14.diagnosis?.details?.length || v14.action_todo?.length || v14.tests?.length || v14.medications?.length || v14.procedures?.length || v14.other?.length || v14.follow_up?.length || v14.why_recommended);
    } else if (isV13) {
      const v13 = ps as ProcessedSummaryV13;
      return !!(v13.summary || v13.reason_for_visit?.length || v13.diagnosis?.details?.length || v13.action_todo?.length || v13.tests?.length || v13.medications?.length || v13.procedures?.length || v13.other?.length || v13.follow_up?.length || v13.why_recommended);
    } else {
      const v12 = ps as ProcessedSummaryV12;
      return !!(v12.summary || v12.reason_for_visit?.length || v12.diagnosis?.details?.length || v12.todos?.length || v12.follow_up?.length || v12.learnings?.length);
    }
  })();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{getAppointmentTitle()}</Text>
          <Text style={styles.headerDate}>{formatAppointmentDate(appointment.appointmentDate)}</Text>
        </View>
      </View>

      <GuestDisclaimer />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.innerContent, isDesktop && styles.innerContentDesktop]}>
          {hasSummaryContent && (
            isV14 ? (
              <AppointmentSummaryV14 summary={ps as ProcessedSummaryV14} />
            ) : isV13 ? (
              <AppointmentSummaryV13 summary={ps as ProcessedSummaryV13} />
            ) : (
              <AppointmentSummaryV12 summary={ps as ProcessedSummaryV12} />
            )
          )}

          <View style={styles.completedActionRow}>
            <TouchableOpacity
              style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
              onPress={handleDownloadPdf}
              activeOpacity={0.7}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="download-outline" size={18} color={Colors.primary} />
              )}
              <Text style={styles.downloadButtonText}>
                {isDownloading ? 'Preparing…' : 'Download PDF'}
              </Text>
            </TouchableOpacity>
            <DeleteAppointmentButton appointmentId={id!} onDeleteStart={() => { isDeletingRef.current = true; }} onDeleteError={setError} style={{ flex: 1 }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightBackground },

  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.lightBackground, gap: 12,
  },
  loadingText: { fontSize: 15, color: Colors.mutedForeground, marginTop: 8 },

  // Not found
  notFoundInline: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  notFoundTitle: { fontSize: 17, fontWeight: '600', color: Colors.gray[700], textAlign: 'center' },
  reasonCard: {
    backgroundColor: Colors.background, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border, width: '100%',
  },
  reasonLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.mutedForeground,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  reasonText: { fontSize: 15, color: Colors.gray[700], lineHeight: 22 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background,
  },
  backButton: { padding: 8, borderRadius: 999 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.primary },
  headerDate: { fontSize: 13, color: Colors.mutedForeground, marginTop: 2 },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  scrollContentDesktop: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 28 },
  innerContent: { width: '100%', gap: 16 },
  innerContentDesktop: { maxWidth: 720, width: '100%' },

  // Processing
  processingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  processingTitle: { fontSize: 18, fontWeight: '600', color: Colors.primary },
  processingSubtitle: { fontSize: 15, color: Colors.mutedForeground, textAlign: 'center' },

  // Details card
  detailsCard: {
    backgroundColor: Colors.background, borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  detailsHeading: { fontSize: 17, fontWeight: '600', color: Colors.primary, marginBottom: 16 },
  detailsList: { gap: 12 },
  detailRow: {},
  detailLabel: { fontSize: 13, color: Colors.mutedForeground, marginBottom: 2 },
  detailValue: { fontSize: 15, color: Colors.foreground },

  // Action row
  actionRow: { flexDirection: 'row', gap: 12 },
  feedbackButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 12, flex: 1,
  },
  feedbackButtonText: { color: Colors.primaryForeground, fontSize: 15, fontWeight: '600' },

  // Processing bottom actions
  processingBottomActions: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },

  // Completed action row (download + delete)
  completedActionRow: { flexDirection: 'row', gap: 12 },
  downloadButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.background, paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 12, flex: 1,
    borderWidth: 1, borderColor: Colors.primary,
  },
  downloadButtonDisabled: { opacity: 0.6 },
  downloadButtonText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
