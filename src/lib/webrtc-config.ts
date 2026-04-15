import { STUN_SERVERS, TURN_CONFIG } from './constants';

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    ...STUN_SERVERS.map((url) => ({ urls: url })),
  ];

  if (TURN_CONFIG.urls) {
    servers.push({
      urls: TURN_CONFIG.urls,
      username: TURN_CONFIG.username,
      credential: TURN_CONFIG.credential,
    });
  }

  return servers;
}

export const WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
};

export const SDP_OFFER_OPTIONS: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};
