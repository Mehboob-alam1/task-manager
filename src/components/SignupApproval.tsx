import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SignupRequest } from '../types';
import {
  getSignupRequests,
  updateSignupRequest,
  deleteSignupRequest,
} from '../firebase/firestore';
import { register } from '../firebase/auth';
import { CheckCircle, XCircle, Clock, Mail } from 'lucide-react';
import { format } from 'date-fns';

export const SignupApproval: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadRequests();
  }, [user, filter]);

  const loadRequests = async () => {
    try {
      const status = filter === 'all' ? undefined : filter;
      const allRequests = await getSignupRequests(status);
      setRequests(allRequests);
    } catch (error) {
      console.error('Error loading signup requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: SignupRequest) => {
    if (!confirm(`Approve signup request for ${request.displayName} (${request.email})?`)) return;
    if (!user) return;

    try {
      // Generate a temporary password
      const tempPassword = `Temp${Math.random().toString(36).substring(2, 15)}!`;
      
      // Create the user account
      await register(
        request.email,
        tempPassword,
        request.displayName,
        request.requestedRole
      );

      // Update the request status
      await updateSignupRequest(request.id, {
        status: 'approved',
        reviewedBy: user.uid,
        reviewedAt: new Date(),
      });

      // TODO: Send email notification with temporary password
      alert(`User account created. Temporary password: ${tempPassword}\n\nPlease send this to the user via email.`);

      loadRequests();
    } catch (error: any) {
      alert('Failed to approve request: ' + error.message);
    }
  };

  const handleReject = async (request: SignupRequest) => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return; // User cancelled
    if (!user) return;

    try {
      await updateSignupRequest(request.id, {
        status: 'rejected',
        reviewedBy: user.uid,
        reviewedAt: new Date(),
        rejectionReason: reason || undefined,
      });

      // TODO: Send email notification
      loadRequests();
    } catch (error: any) {
      alert('Failed to reject request: ' + error.message);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    try {
      await deleteSignupRequest(requestId);
      loadRequests();
    } catch (error: any) {
      alert('Failed to delete request: ' + error.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (user?.role !== 'admin') {
    return <div className="text-center py-12">Access denied. Admin only.</div>;
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Signup Requests</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="block border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {requests.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <Mail className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p>No signup requests found.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {requests.map((request) => (
              <li key={request.id} className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(request.status)}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{request.displayName}</h3>
                        <p className="text-sm text-gray-500">{request.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 ml-8">
                      <span>Requested Role: <span className="font-medium capitalize">{request.requestedRole}</span></span>
                      <span>Requested: {format(request.requestedAt, 'MMM dd, yyyy HH:mm')}</span>
                      {request.reviewedAt && (
                        <span>Reviewed: {format(request.reviewedAt, 'MMM dd, yyyy HH:mm')}</span>
                      )}
                      {request.rejectionReason && (
                        <span className="text-red-600">Reason: {request.rejectionReason}</span>
                      )}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApprove(request)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleDelete(request.id)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
