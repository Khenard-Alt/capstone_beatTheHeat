import { fetchCurrentWeather } from './weather.service';
import type { HeatLevel } from '../types';

export type ChatbotAudience = 'parent' | 'teacher' | 'head-teacher' | 'principal';

// Friendly openers, picked at random so a repeated fallback (e.g. two failed
// questions in a row) doesn't read like a copy-pasted error message.
const OPENERS = [
	"Medyo nahihirapan akong kumonekta sa full advisory service ngayon, pero narito pa rin ako para tumulong —",
	"Hindi ko makuha yung detalyadong AI advisory sa ngayon, pero may alam akong makakatulong —",
	"May konting abala sa advisory service, pero check ko muna yung live na datos para sa'yo —",
];

const OFFLINE_OPENERS = [
	"Medyo nahihirapan akong kumonekta ngayon, at hindi ko rin makuha ang live weather data.",
	"Parang may connection issue sa ngayon — hindi ko makuha kahit yung live weather data.",
];

const HEAT_LEVEL_LABEL: Record<HeatLevel, string> = {
	normal: 'ligtas (safe)',
	caution: 'caution',
	'extreme-caution': 'extreme caution',
	danger: 'danger',
	'extreme-danger': 'extreme danger',
};

const ROLE_TIPS: Record<ChatbotAudience, string[]> = {
	parent: [
		'Siguraduhing may dalang tubig at light clothing ang anak mo kapag papasok.',
		'Bantayan ang mga sintomas tulad ng pagkahilo o pagkapagod kapag mainit.',
		'Kung sobrang init na, ipagpalagay mong iwasan muna ang matagal na outdoor na gawain.',
	],
	teacher: [
		'Panatilihing may access sa inuming tubig ang mga estudyante sa klase.',
		'Isaalang-alang ang shaded o indoor na alternatibo para sa PE kapag mataas ang heat index.',
		'Bantayan ang mga estudyanteng madaling ma-heat stress at i-report agad sa clinic kung kailangan.',
	],
	'head-teacher': [
		'I-review ang kasalukuyang incident log at heat advisory bago gumawa ng desisyon.',
		'Makipag-ugnayan sa mga adviser tungkol sa mga estudyanteng kailangan ng espesyal na pag-iingat.',
		'Siguraduhing updated ang mga guidance na ibinibigay sa mga teachers.',
	],
	principal: [
		'Kumpirmahin ang desisyon base sa school heat policy at live na weather data.',
		'I-notify ang mga teacher, parent, at clinic kung magbabago ang operations.',
		'I-coordinate sa head teacher para sa current incident status bago mag-anunsyo.',
	],
};

export interface HumanizedFallback {
	text: string;
	meta: string;
}

// Called when the full AI advisory call fails (timeout, network blip, etc).
// Rather than a flat "service unavailable" line, this tries the lighter,
// more reliable live-weather endpoint directly and composes a genuinely
// useful, conversational reply from it — only falling back to a plain
// apology if even that can't be reached.
export const buildHumanizedFallback = async (audience: ChatbotAudience): Promise<HumanizedFallback> => {
	const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
	const tips = ROLE_TIPS[audience];

	try {
		const weather = await fetchCurrentWeather();
		const levelLabel = HEAT_LEVEL_LABEL[weather.heatLevel] ?? weather.heatLevel;
		const pickedTips = [...tips].sort(() => Math.random() - 0.5).slice(0, 2);

		return {
			text: [
				opener,
				'',
				`Live na heat index ngayon: ${weather.heatIndexC.toFixed(1)}°C (${levelLabel}), temperatura ${weather.temperature.toFixed(1)}°C, humidity ${weather.humidity}%.`,
				'',
				...pickedTips.map((tip) => `• ${tip}`),
				'',
				'Subukan mo ulit yung tanong mo mamaya para sa mas detalyadong sagot.',
			].join('\n'),
			meta: 'Fallback — live weather data',
		};
	} catch {
		// Even the lightweight weather endpoint is unreachable — be honest
		// about that instead of pretending to have data.
		const offlineOpener = OFFLINE_OPENERS[Math.floor(Math.random() * OFFLINE_OPENERS.length)];
		return {
			text: [
				offlineOpener,
				'',
				'Paki-check na lang muna ang latest heat advisory sa dashboard, at subukan ulit mamaya.',
			].join('\n'),
			meta: 'Fallback response',
		};
	}
};
