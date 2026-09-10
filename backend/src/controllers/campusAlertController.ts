import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdminClient } from '../config/supabase';

const DEFAULT_SCHOOL_ID = 'school-1';

const defaultAlert = {
	schoolId: DEFAULT_SCHOOL_ID,
	active: false,
	title: 'CLASS SUSPENSION',
	message: 'All classes are suspended.',
	updatedAt: new Date().toISOString(),
};

const mapRow = (row: any) => ({
	schoolId: row.school_id,
	active: row.active,
	title: row.title,
	message: row.message,
	updatedAt: row.updated_at,
});

export const getCampusAlert = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const schoolId = (req.query.schoolId as string) || DEFAULT_SCHOOL_ID;
		const client = getSupabaseAdminClient();

		if (!client) {
			res.status(200).json({ success: true, data: defaultAlert });
			return;
		}

		const { data, error } = await client
			.from('campus_alerts')
			.select('school_id, active, title, message, updated_at')
			.eq('school_id', schoolId)
			.maybeSingle();

		if (error) {
			res.status(500).json({ success: false, message: 'Failed to fetch campus alert', error: error.message });
			return;
		}

		res.status(200).json({ success: true, data: data ? mapRow(data) : { ...defaultAlert, schoolId } });
	} catch (error) {
		next(error);
	}
};

export const setCampusAlert = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { schoolId, active, title, message } = req.body;
		const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;

		if (typeof active !== 'boolean') {
			res.status(400).json({ success: false, message: '"active" must be a boolean.' });
			return;
		}

		const client = getSupabaseAdminClient();
		if (!client) {
			res.status(200).json({
				success: true,
				message: 'Campus alert updated (fallback mode, not persisted)',
				data: { schoolId: targetSchoolId, active, title: title || defaultAlert.title, message: message || defaultAlert.message, updatedAt: new Date().toISOString() },
			});
			return;
		}

		const { data, error } = await client
			.from('campus_alerts')
			.upsert({
				school_id: targetSchoolId,
				active,
				title: (title || defaultAlert.title).trim(),
				message: (message || defaultAlert.message).trim(),
				updated_at: new Date().toISOString(),
			})
			.select('school_id, active, title, message, updated_at')
			.single();

		if (error) {
			res.status(500).json({ success: false, message: 'Failed to update campus alert', error: error.message });
			return;
		}

		res.status(200).json({ success: true, message: 'Campus alert updated', data: mapRow(data) });
	} catch (error) {
		next(error);
	}
};
