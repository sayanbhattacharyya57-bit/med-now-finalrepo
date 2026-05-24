/**
 * MedNow API — Complete Endpoint Reference
 *
 * Base URL: /api/v1
 *
 * ─── AUTH ─────────────────────────────────────────────────────────
 * POST   /auth/register          Register patient/doctor/admin
 * POST   /auth/login             Login (returns JWT pair)
 * POST   /auth/refresh-token     Refresh access token
 * POST   /auth/logout            Invalidate refresh token
 * GET    /auth/me                Get current user profile
 * PUT    /auth/profile           Update profile
 * PUT    /auth/change-password   Change password
 * GET    /auth/doctors           List doctors (filterable)
 *
 * ─── HOSPITALS ────────────────────────────────────────────────────
 * GET    /hospitals              List all hospitals
 * GET    /hospitals/nearest      Nearest hospitals by lat/lng
 * GET    /hospitals/:id          Hospital details
 * GET    /hospitals/:id/stats    Hospital dashboard stats
 * POST   /hospitals              Create hospital (admin)
 * PUT    /hospitals/:id          Update hospital (admin)
 * PATCH  /hospitals/:id/beds     Update bed availability
 * PATCH  /hospitals/:id/oxygen   Update oxygen availability
 * POST   /hospitals/:id/doctors  Add doctor to hospital
 *
 * ─── APPOINTMENTS ─────────────────────────────────────────────────
 * GET    /appointments/slots     Available doctor slots
 * GET    /appointments           My appointments
 * GET    /appointments/:id       Appointment details
 * POST   /appointments           Book appointment (patient)
 * PATCH  /appointments/:id/confirm      Confirm (doctor)
 * PATCH  /appointments/:id/cancel       Cancel
 * PATCH  /appointments/:id/reschedule   Reschedule
 * PATCH  /appointments/:id/prescription Add prescription (doctor)
 * POST   /appointments/:id/feedback     Rate appointment (patient)
 *
 * ─── AMBULANCE ────────────────────────────────────────────────────
 * POST   /ambulance/request      Request ambulance
 * GET    /ambulance/my           My ambulance requests
 * GET    /ambulance/:id          Request details
 * PATCH  /ambulance/:id/status   Update status (admin)
 * PATCH  /ambulance/:id/location Live location update
 *
 * ─── SOS ──────────────────────────────────────────────────────────
 * POST   /sos/trigger            Trigger emergency SOS
 * GET    /sos/my                 My SOS history
 * GET    /sos/active             Active alerts (admin)
 * PATCH  /sos/:id/resolve        Resolve alert (admin/doctor)
 *
 * ─── AI CHATBOT ───────────────────────────────────────────────────
 * POST   /chatbot/message        Chat with MedBot (Gemini AI)
 * POST   /chatbot/analyze-symptoms  AI symptom analysis
 * GET    /chatbot/health-tip     Daily health tip
 *
 * ─── MEDICINES ────────────────────────────────────────────────────
 * GET    /medicines              List medicines
 * GET    /medicines/low-stock    Low stock alerts (admin)
 * GET    /medicines/:id          Medicine details
 * POST   /medicines              Add medicine (admin)
 * PUT    /medicines/:id          Update medicine (admin)
 * PATCH  /medicines/:id/stock    Update stock (admin)
 * DELETE /medicines/:id          Remove medicine (admin)
 *
 * ─── HEALTH RECORDS ───────────────────────────────────────────────
 * GET    /health-records         My records
 * GET    /health-records/:id     Record details
 * POST   /health-records         Create record
 * PUT    /health-records/:id     Update record
 * DELETE /health-records/:id     Delete record
 * PATCH  /health-records/:id/share  Share with doctors
 * POST   /health-records/sync    Sync offline records
 *
 * ─── NOTIFICATIONS ────────────────────────────────────────────────
 * GET    /notifications          My notifications (with unreadCount)
 * PATCH  /notifications/read     Mark as read
 * DELETE /notifications/clear    Clear read notifications
 * DELETE /notifications/:id      Delete single notification
 *
 * ─── SOCKET.IO EVENTS ─────────────────────────────────────────────
 * Client → Server:
 *   chat:join        { roomId }
 *   chat:message     { roomId, content, type, recipientId, appointmentId }
 *   chat:typing      { roomId, isTyping }
 *   chat:history     { roomId, page, limit }
 *   call:join        { roomId, appointmentId }
 *   call:offer       { roomId, offer, targetSocketId }
 *   call:answer      { answer, targetSocketId }
 *   call:ice-candidate { candidate, targetSocketId, roomId }
 *   call:end         { roomId }
 *   call:mute        { roomId, muted, video }
 *   hospital:join    { hospitalId }
 *   ambulance:track  { requestId }
 *   sos:monitor      (admin/doctor only)
 *
 * Server → Client:
 *   notification           New notification
 *   chat:message           Incoming chat message
 *   chat:typing            Typing indicator
 *   chat:history           Message history
 *   call:user-joined       Peer joined call
 *   call:offer             WebRTC offer from peer
 *   call:answer            WebRTC answer from peer
 *   call:ice-candidate     ICE candidate from peer
 *   call:ended             Call ended by peer
 *   call:mute              Peer muted/unmuted
 *   sos:alert              Emergency alert (hospital rooms)
 *   sos:resolved           Alert resolved
 *   ambulance:request      New ambulance request (hospital)
 *   ambulance:statusUpdate Status change
 *   ambulance:locationUpdate Live location
 */

module.exports = {};
