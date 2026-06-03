import * as Location from 'expo-location';

export type RecordingLawStatus = 'green' | 'yellow' | 'red';

export interface RecordingLawResult {
  status: RecordingLawStatus;
  stateName: string;
  stateCode: string;
  message: string;
  canRecord: boolean;
}

// Two-party/all-party consent states with public space exception info
const TWO_PARTY_STATES: Record<string, { name: string; hasPublicException: boolean }> = {
  CA: { name: 'California',      hasPublicException: true  },
  CT: { name: 'Connecticut',     hasPublicException: true  },
  FL: { name: 'Florida',         hasPublicException: true  },
  IL: { name: 'Illinois',        hasPublicException: true  },
  MD: { name: 'Maryland',        hasPublicException: true  },
  MA: { name: 'Massachusetts',   hasPublicException: false },
  MI: { name: 'Michigan',        hasPublicException: true  },
  MT: { name: 'Montana',         hasPublicException: false },
  NV: { name: 'Nevada',          hasPublicException: true  },
  NH: { name: 'New Hampshire',   hasPublicException: false },
  OR: { name: 'Oregon',          hasPublicException: true  },
  PA: { name: 'Pennsylvania',    hasPublicException: true  },
  WA: { name: 'Washington',      hasPublicException: true  },
};

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',
  KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',
  MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',
  NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',
  NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  DC:'District of Columbia',
};

export function checkRecordingLawForState(stateCode: string): RecordingLawResult {
  const code = stateCode.toUpperCase();
  const stateName = STATE_NAMES[code] || stateCode;

  if (TWO_PARTY_STATES[code]) {
    const info = TWO_PARTY_STATES[code];
    if (info.hasPublicException) {
      return {
        status: 'yellow',
        stateName,
        stateCode: code,
        canRecord: true,
        message: `${stateName} requires all-party consent for recording. Recording police officers performing official duties in public spaces is generally protected by the First Amendment. Officer consent has been captured. Consult an attorney for complete guidance in ${stateName}.`,
      };
    } else {
      return {
        status: 'red',
        stateName,
        stateCode: code,
        canRecord: false,
        message: `Audio recording has been automatically paused. ${stateName} has strict all-party consent requirements without a clear public space exception. Your interaction is fully documented with officer credentials, timestamp, GPS, and a tamper-proof log. Consult a local attorney regarding your recording rights in ${stateName}.`,
      };
    }
  }

  return {
    status: 'green',
    stateName,
    stateCode: code,
    canRecord: true,
    message: `Recording is permitted in ${stateName}. Officer consent has been captured and logged.`,
  };
}

export async function getStateFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results?.length > 0) {
      const region = results[0].region;
      // Convert full state name to code if needed
      if (region && region.length === 2) return region;
      // Find code from name
      const entry = Object.entries(STATE_NAMES).find(
        ([, name]) => name.toLowerCase() === region?.toLowerCase()
      );
      return entry ? entry[0] : null;
    }
    return null;
  } catch (e) {
    console.error('Reverse geocode error:', e);
    return null;
  }
}

export async function checkRecordingCompliance(
  latitude: number | null,
  longitude: number | null
): Promise<RecordingLawResult> {
  if (!latitude || !longitude) {
    return {
      status: 'yellow',
      stateName: 'Unknown',
      stateCode: 'UNKNOWN',
      canRecord: true,
      message: 'Location unavailable. Recording is proceeding. Please verify local recording laws apply to your situation.',
    };
  }

  try {
    const stateCode = await getStateFromCoordinates(latitude, longitude);
    if (!stateCode) {
      return {
        status: 'yellow',
        stateName: 'Unknown',
        stateCode: 'UNKNOWN',
        canRecord: true,
        message: 'Could not determine your state. Recording is proceeding with caution. Consult local laws regarding recording rights.',
      };
    }
    return checkRecordingLawForState(stateCode);
  } catch (e) {
    return {
      status: 'yellow',
      stateName: 'Unknown',
      stateCode: 'UNKNOWN',
      canRecord: true,
      message: 'Location check encountered an error. Recording proceeding. Consult local recording laws.',
    };
  }
}
