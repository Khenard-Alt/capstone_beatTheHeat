import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import {
  MdSchool,
  MdGroup,
  MdPersonAdd,
  MdOutlineSupervisorAccount,
  MdRefresh,
  MdSearch,
} from 'react-icons/md';
import '../styles/SchoolManagement.css';

type UsersTab = 'parents' | 'students';

type ParentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
};

type StudentRecord = {
  id: string;
  name: string;
  grade?: string;
  schoolId: string;
  studentNumber?: string;
  section?: string;
  parentUserId?: string | null;
  advisoryTeacherId?: string | null;
};

type TeacherUser = {
  id: string;
  firstName: string;
  lastName: string;
};

const ADMIN_AUTH_STORAGE_KEY = 'school_management_admin_unlocked';

const emptyParentForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  childId: '',
};

const emptyStudentForm = {
  id: '',
  studentNumber: '',
  firstName: '',
  lastName: '',
  gradeLevel: '',
  section: '',
  parentUserId: '',
  advisoryTeacherId: '',
};

export const SchoolManagement: React.FC = () => {
  const { user } = useAuth();
  const [usersTab, setUsersTab] = useState<UsersTab>('parents');
  const [adminUnlocked, setAdminUnlocked] = useState(() => {
    const isUnlocked = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true';
    if (!isUnlocked && user?.id === 'admin-auth-session') {
      return true;
    }
    return isUnlocked;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [parents, setParents] = useState<ParentUser[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [parentForm, setParentForm] = useState(emptyParentForm);
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [thresholds, setThresholds] = useState({
    safeMax: '27',
    cautionMax: '32',
    extremeCautionMax: '41',
    dangerMax: '54',
  });
  const [thresholdsSaving, setThresholdsSaving] = useState(false);
  const [thresholdsMessage, setThresholdsMessage] = useState('');

  const parentCount = parents.length;
  const studentCount = students.length;

  const selectedParentChildOptions = useMemo(
    () => students.map((student) => ({ value: student.id, label: `${student.name}${student.grade ? ` - ${student.grade}` : ''}` })),
    [students]
  );

  const deleteParent = async (parentId: string) => {
    if (!window.confirm('Delete this parent account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiClient.delete(`/api/users/${parentId}`);
      setSuccess('Parent account deleted successfully.');
      await refreshData();
    } catch (deleteError) {
      console.error('Failed to delete parent:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete parent account.');
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!window.confirm('Delete this student record? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiClient.delete(`/api/students/${studentId}`);
      setSuccess('Student record deleted successfully.');
      await refreshData();
    } catch (deleteError) {
      console.error('Failed to delete student:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete student.');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = useCallback(async () => {
    if (!adminUnlocked) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [parentResponse, studentResponse, teacherResponse] = await Promise.all([
        apiClient.get('/api/users', { params: { role: 'parent' } }),
        apiClient.get('/api/students'),
        apiClient.get('/api/users', { params: { role: 'teacher' } }),
      ]);

      setParents(parentResponse.data.users || []);
      setStudents(studentResponse.data.students || []);
      setTeachers(teacherResponse.data.users || []);
      setSuccess('');
    } catch (refreshError) {
      console.error('Failed to refresh management data:', refreshError);
      setError('Failed to refresh user management data.');
    } finally {
      setLoading(false);
    }
  }, [adminUnlocked]);

  useEffect(() => {
    if (!adminUnlocked) {
      return;
    }

    void refreshData();
  }, [adminUnlocked, refreshData]);

  useEffect(() => {
    const isUnlocked = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true' || user?.id === 'admin-auth-session';
    if (isUnlocked !== adminUnlocked) {
      setAdminUnlocked(isUnlocked);
      if (isUnlocked) {
        void refreshData();
      }
    }
  }, [refreshData, user?.id, adminUnlocked]);

  useEffect(() => {
    const loadThresholds = async () => {
      try {
        const { data } = await apiClient.get('/api/admin/heat-thresholds');
        if (data?.thresholds) {
          setThresholds({
            safeMax: String(data.thresholds.safeMax),
            cautionMax: String(data.thresholds.cautionMax),
            extremeCautionMax: String(data.thresholds.extremeCautionMax),
            dangerMax: String(data.thresholds.dangerMax),
          });
        }
      } catch (thresholdsError) {
        console.error('Failed to load heat thresholds:', thresholdsError);
      }
    };

    void loadThresholds();
  }, []);

  const handleThresholdChange = (name: string, value: string) => {
    setThresholds((current) => ({ ...current, [name]: value }));
  };

  const submitThresholds = async () => {
    if (!adminUnlocked) {
      setThresholdsMessage('Unlock admin auth first.');
      return;
    }

    setThresholdsSaving(true);
    setThresholdsMessage('');
    try {
      const { data } = await apiClient.put('/api/admin/heat-thresholds', {
        safeMax: Number(thresholds.safeMax),
        cautionMax: Number(thresholds.cautionMax),
        extremeCautionMax: Number(thresholds.extremeCautionMax),
        dangerMax: Number(thresholds.dangerMax),
      });
      setThresholdsMessage(data?.success ? 'Heat index thresholds updated.' : (data?.message || 'Failed to update thresholds.'));
    } catch (thresholdsError: any) {
      setThresholdsMessage(thresholdsError?.response?.data?.message || 'Failed to update thresholds.');
    } finally {
      setThresholdsSaving(false);
    }
  };

  const handleParentFormChange = (name: string, value: string) => {
    setParentForm((current) => ({ ...current, [name]: value }));
  };

  const handleStudentFormChange = (name: string, value: string) => {
    setStudentForm((current) => ({ ...current, [name]: value }));
  };

  const submitParent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminUnlocked) {
      setError('Unlock admin auth first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/users/register', {
        ...parentForm,
        role: 'parent',
        childId: parentForm.childId || undefined,
      });

      setParentForm(emptyParentForm);
      setSuccess('Parent account created successfully.');
      await refreshData();
    } catch (parentError) {
      console.error('Failed to create parent:', parentError);
      setError(parentError instanceof Error ? parentError.message : 'Failed to create parent account.');
    } finally {
      setLoading(false);
    }
  };

  const submitStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminUnlocked) {
      setError('Unlock admin auth first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/students', {
        ...studentForm,
        parentUserId: studentForm.parentUserId || null,
        advisoryTeacherId: studentForm.advisoryTeacherId || null,
      });

      setStudentForm(emptyStudentForm);
      setSuccess('Student record created successfully.');
      await refreshData();
    } catch (studentError) {
      console.error('Failed to create student:', studentError);
      setError(studentError instanceof Error ? studentError.message : 'Failed to create student.');
    } finally {
      setLoading(false);
    }
  };

  const assignAdvisoryTeacher = async (studentId: string, advisoryTeacherId: string) => {
    setLoading(true);
    setError('');
    try {
      await apiClient.put(`/api/students/${studentId}`, { advisoryTeacherId: advisoryTeacherId || null });
      setSuccess('Advisory teacher updated.');
      await refreshData();
    } catch (assignError) {
      console.error('Failed to assign advisory teacher:', assignError);
      setError(assignError instanceof Error ? assignError.message : 'Failed to assign advisory teacher.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="school-management-page">
        <Card>
          <div className="no-access">
            <h2>Access Denied</h2>
            <p>You don't have permission to access school management.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="school-management-page">
      <div className="page-header">
        <div>
          <h1>
            <MdSchool /> School Management
          </h1>
          <p>Manage school information, parent accounts, and student records</p>
        </div>
        <div className="page-header-actions">
          <Button variant="secondary" type="button" icon={<MdRefresh />} onClick={() => void refreshData()} disabled={!adminUnlocked}>
            Refresh Data
          </Button>
        </div>
      </div>

      {error && <div className="admin-inline-alert error">{error}</div>}
      {success && <div className="admin-inline-alert success">{success}</div>}

      <div className="school-grid">
        <Card title="Heat Index Thresholds">
          <p className="card-description">
            Configure custom heat index thresholds for your school
          </p>

          <div className="threshold-settings">
            <Input
              label="Normal Threshold (°C)"
              type="number"
              value={thresholds.safeMax}
              onChange={(event) => handleThresholdChange('safeMax', event.target.value)}
              disabled={!adminUnlocked}
              fullWidth
            />
            <Input
              label="Caution Threshold (°C)"
              type="number"
              value={thresholds.cautionMax}
              onChange={(event) => handleThresholdChange('cautionMax', event.target.value)}
              disabled={!adminUnlocked}
              fullWidth
            />
            <Input
              label="Extreme Caution Threshold (°C)"
              type="number"
              value={thresholds.extremeCautionMax}
              onChange={(event) => handleThresholdChange('extremeCautionMax', event.target.value)}
              disabled={!adminUnlocked}
              fullWidth
            />
            <Input
              label="Danger Threshold (°C)"
              type="number"
              value={thresholds.dangerMax}
              onChange={(event) => handleThresholdChange('dangerMax', event.target.value)}
              disabled={!adminUnlocked}
              fullWidth
            />
          </div>

          <Button variant="primary" type="button" loading={thresholdsSaving} disabled={!adminUnlocked} onClick={() => void submitThresholds()}>
            Update Thresholds
          </Button>
          {thresholdsMessage && <p className="setting-description">{thresholdsMessage}</p>}
        </Card>
      </div>

      <Card
        title="Users Management"
        actions={
          <div className="user-management-actions">
            <Button
              variant={usersTab === 'parents' ? 'primary' : 'outline'}
              type="button"
              icon={<MdOutlineSupervisorAccount />}
              onClick={() => setUsersTab('parents')}
            >
              Parents
            </Button>
            <Button
              variant={usersTab === 'students' ? 'primary' : 'outline'}
              type="button"
              icon={<MdGroup />}
              onClick={() => setUsersTab('students')}
            >
              Students
            </Button>
          </div>
        }
      >
        <div className="management-stats-grid">
          <div className="stat-box">
            <div className="stat-value">{parentCount}</div>
            <div className="stat-label">Parents</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{studentCount}</div>
            <div className="stat-label">Students</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{adminUnlocked ? 'Unlocked' : 'Locked'}</div>
            <div className="stat-label">Admin Auth</div>
          </div>
        </div>

        {!adminUnlocked && (
          <div className="management-locked-note">
            Open Login page and press Ctrl + Shift + A to unlock add/edit actions.
          </div>
        )}

        <div className="management-panel-grid">
          <form className="management-form" onSubmit={usersTab === 'parents' ? submitParent : submitStudent}>
            {usersTab === 'parents' ? (
              <>
                <div className="form-section-title">
                  <MdPersonAdd /> Add Parent Account
                </div>
                <div className="form-row">
                  <Input label="First Name" value={parentForm.firstName} onChange={(event) => handleParentFormChange('firstName', event.target.value)} />
                  <Input label="Last Name" value={parentForm.lastName} onChange={(event) => handleParentFormChange('lastName', event.target.value)} />
                </div>
                <Input label="Email" value={parentForm.email} onChange={(event) => handleParentFormChange('email', event.target.value)} />
                <Input label="Phone" value={parentForm.phone} onChange={(event) => handleParentFormChange('phone', event.target.value)} />
                <Input label="Password" type="password" value={parentForm.password} onChange={(event) => handleParentFormChange('password', event.target.value)} />
                <label className="select-group">
                  <span className="select-label">Link Child Student (optional)</span>
                  <select className="select-field" value={parentForm.childId} onChange={(event) => handleParentFormChange('childId', event.target.value)}>
                    <option value="">Select a student</option>
                    {selectedParentChildOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="management-form-actions">
                  <Button variant="primary" type="submit" loading={loading} disabled={!adminUnlocked}>
                    Add Parent
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="form-section-title">
                  <MdGroup /> Add Student Record
                </div>
                <Input label="Student ID" value={studentForm.id} onChange={(event) => handleStudentFormChange('id', event.target.value)} placeholder="Optional custom ID" />
                <Input label="Student Number" value={studentForm.studentNumber} onChange={(event) => handleStudentFormChange('studentNumber', event.target.value)} />
                <div className="form-row">
                  <Input label="First Name" value={studentForm.firstName} onChange={(event) => handleStudentFormChange('firstName', event.target.value)} />
                  <Input label="Last Name" value={studentForm.lastName} onChange={(event) => handleStudentFormChange('lastName', event.target.value)} />
                </div>
                <div className="form-row">
                  <Input label="Grade Level" value={studentForm.gradeLevel} onChange={(event) => handleStudentFormChange('gradeLevel', event.target.value)} placeholder="Grade 3" />
                  <Input label="Section" value={studentForm.section} onChange={(event) => handleStudentFormChange('section', event.target.value)} placeholder="A" />
                </div>
                <label className="select-group">
                  <span className="select-label">Parent User Link (optional)</span>
                  <select className="select-field" value={studentForm.parentUserId} onChange={(event) => handleStudentFormChange('parentUserId', event.target.value)}>
                    <option value="">Select parent</option>
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.firstName} {parent.lastName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="select-group">
                  <span className="select-label">Advisory Teacher (optional)</span>
                  <select className="select-field" value={studentForm.advisoryTeacherId} onChange={(event) => handleStudentFormChange('advisoryTeacherId', event.target.value)}>
                    <option value="">Select advisory teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="management-form-actions">
                  <Button variant="primary" type="submit" loading={loading} disabled={!adminUnlocked}>
                    Add Student
                  </Button>
                </div>
              </>
            )}
          </form>

          <div className="management-list-panel">
            {usersTab === 'parents' ? (
              <>
                <div className="list-panel-header">
                  <h3>Parent Accounts</h3>
                  <span>{parents.length} record(s)</span>
                </div>
                <div className="management-search-box">
                  <MdSearch />
                  <input type="text" placeholder="Browse parent accounts in the table below" readOnly />
                </div>
                <div className="management-table">
                  {parents.length === 0 && <div className="empty-state">No parent accounts yet.</div>}
                  {parents.map((parent) => (
                    <div key={parent.id} className="management-table-row">
                      <div>
                        <strong>{parent.firstName} {parent.lastName}</strong>
                        <div className="muted-text">{parent.email}</div>
                      </div>
                      <div className="row-meta">
                        <span className="role-pill">{parent.role}</span>
                        {parent.phone && <span>{parent.phone}</span>}
                        {adminUnlocked && (
                          <button
                            type="button"
                            className="btn-delete-small"
                            onClick={() => deleteParent(parent.id)}
                            title="Delete parent account"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="list-panel-header">
                  <h3>Student Records</h3>
                  <span>{students.length} record(s)</span>
                </div>
                <div className="management-table">
                  {students.length === 0 && <div className="empty-state">No student records yet.</div>}
                  {students.map((student) => (
                    <div key={student.id} className="management-table-row">
                      <div>
                        <strong>{student.name}</strong>
                        <div className="muted-text">{student.studentNumber || 'No student number'}</div>
                      </div>
                      <div className="row-meta">
                        {student.grade && <span>{student.grade}</span>}
                        {student.section && <span>Section {student.section}</span>}
                        {adminUnlocked && (
                          <select
                            className="select-field"
                            style={{ maxWidth: 180 }}
                            value={student.advisoryTeacherId || ''}
                            onChange={(event) => void assignAdvisoryTeacher(student.id, event.target.value)}
                            title="Assign advisory teacher"
                          >
                            <option value="">No advisory teacher</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.firstName} {teacher.lastName}
                              </option>
                            ))}
                          </select>
                        )}
                        {adminUnlocked && (
                          <button
                            type="button"
                            className="btn-delete-small"
                            onClick={() => deleteStudent(student.id)}
                            title="Delete student record"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

    </div>
  );
};
