import { useState, useEffect, useCallback } from 'react';
import { VideoQuality, QUALITY_PRESETS } from '@/types/conference';

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface UseMediaDevicesReturn {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  error: string | null;
  initializeMedia: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  selectAudioDevice: (deviceId: string) => Promise<void>;
  selectVideoDevice: (deviceId: string) => Promise<void>;
  setQuality: (quality: VideoQuality) => Promise<void>;
  stopAllMedia: () => void;
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>('medium');

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audio = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`, kind: d.kind }));
      const video = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}`, kind: d.kind }));
      
      setAudioDevices(audio);
      setVideoDevices(video);
      
      if (audio.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audio[0].deviceId);
      }
      if (video.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(video[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }, [selectedAudioDevice, selectedVideoDevice]);

  const getMediaConstraints = useCallback((quality: VideoQuality = currentQuality) => {
    const preset = quality === 'auto' ? QUALITY_PRESETS.medium : QUALITY_PRESETS[quality];
    return {
      audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
      video: selectedVideoDevice
        ? {
            deviceId: { exact: selectedVideoDevice },
            width: { ideal: preset.width },
            height: { ideal: preset.height },
            frameRate: { ideal: preset.frameRate },
          }
        : {
            width: { ideal: preset.width },
            height: { ideal: preset.height },
            frameRate: { ideal: preset.frameRate },
          },
    };
  }, [selectedAudioDevice, selectedVideoDevice, currentQuality]);

  const initializeMedia = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
      setLocalStream(stream);
      await enumerateDevices();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access media devices';
      setError(errorMessage);
      console.error('Error initializing media:', err);
    }
  }, [getMediaConstraints, enumerateDevices]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled((prev) => !prev);
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled((prev) => !prev);
    }
  }, [localStream]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: true,
      });
      
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setIsScreenSharing(false);
      };
      
      setScreenStream(stream);
      setIsScreenSharing(true);
    } catch (err) {
      console.error('Error starting screen share:', err);
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  }, [screenStream]);

  const selectAudioDevice = useCallback(async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    if (localStream) {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false,
      });
      
      const oldAudioTrack = localStream.getAudioTracks()[0];
      if (oldAudioTrack) {
        localStream.removeTrack(oldAudioTrack);
        oldAudioTrack.stop();
      }
      
      localStream.addTrack(newStream.getAudioTracks()[0]);
    }
  }, [localStream]);

  const selectVideoDevice = useCallback(async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    if (localStream) {
      const preset = currentQuality === 'auto' ? QUALITY_PRESETS.medium : QUALITY_PRESETS[currentQuality];
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: preset.frameRate },
        },
      });
      
      const oldVideoTrack = localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        localStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      
      localStream.addTrack(newStream.getVideoTracks()[0]);
    }
  }, [localStream, currentQuality]);

  const setQuality = useCallback(async (quality: VideoQuality) => {
    setCurrentQuality(quality);
    if (localStream && localStream.getVideoTracks().length > 0) {
      const preset = quality === 'auto' ? QUALITY_PRESETS.medium : QUALITY_PRESETS[quality];
      const videoTrack = localStream.getVideoTracks()[0];
      
      try {
        await videoTrack.applyConstraints({
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: preset.frameRate },
        });
      } catch (err) {
        console.error('Error applying quality constraints:', err);
      }
    }
  }, [localStream]);

  const stopAllMedia = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);
  }, [localStream, screenStream]);

  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  return {
    localStream,
    screenStream,
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    error,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    selectAudioDevice,
    selectVideoDevice,
    setQuality,
    stopAllMedia,
  };
}
