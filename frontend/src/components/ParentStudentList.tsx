import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';

/** Parent-only: lists the children linked to the signed-in parent's account. */
export const ParentStudentList: React.FC = () => {
  const { user } = useAuth();
  const [childrenData, setChildrenData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const fetchChildren = async () => {
      try {
        const userResp = await apiClient.get(`/api/users/${user.id}`);
        if (mounted && userResp?.data) {
          const maybeUser = userResp.data.user || userResp.data;
          if (maybeUser && (maybeUser.children || maybeUser.students || maybeUser.childList)) {
            const list = maybeUser.children || maybeUser.students || maybeUser.childList;
            setChildrenData(Array.isArray(list) ? list : []);
            return;
          }
        }
        const tryUserChildren = await apiClient.get(`/api/users/${user.id}/children`);
        if (mounted && tryUserChildren?.data?.children) {
          setChildrenData(tryUserChildren.data.children);
          return;
        }
      } catch (err) {
        console.error('users/:id children fetch error', err);
      }

      try {
        const resp = await apiClient.get(`/api/students?parentId=${user.id}`);
        if (mounted && resp?.data?.data) {
          const payload = resp.data.data || resp.data;
          setChildrenData(Array.isArray(payload) ? payload : []);
        }
      } catch (err) {
        console.error('students?parentId fetch error', err);
        if (mounted) setChildrenData([]);
      }
    };

    fetchChildren();
    return () => { mounted = false; };
  }, [user]);

  const childrenListFromUser: any[] = (user as any)?.children || (user as any)?.students || (user as any)?.childList || [];
  const childrenList: any[] = (childrenData && childrenData.length > 0) ? childrenData : childrenListFromUser;

  return (
    <div style={{ gridColumn: '1 / -1', marginTop: 6 }} className="parent-student-section">
      <div className="parent-student-header">
        <span className="parent-profile-label">Student(s)</span>
      </div>
      <div className="parent-student-list">
        {Array.isArray(childrenList) && childrenList.length > 0 ? (
          childrenList.map((c: any) => (
            <div key={c.id || c.studentId || c.name} className="parent-student-item">
              <strong>{c.name || c.fullName || c.studentName}</strong>
              <div className="parent-student-meta">{c.grade || c.year || ''}{c.section ? ` — ${c.section}` : ''}</div>
            </div>
          ))
        ) : (
          <div className="parent-student-item"><em>No student information available</em></div>
        )}
      </div>
    </div>
  );
};
