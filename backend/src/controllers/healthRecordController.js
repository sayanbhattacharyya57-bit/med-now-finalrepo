const HealthRecord = require("../models/HealthRecord");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");

const getMyRecords = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20, search, startDate, endDate } = req.query;
    const filter = { patient: req.user._id };

    if (type) filter.type = type;
    if (search) filter.$text = { $search: search };
    if (startDate || endDate) {
      filter.recordDate = {};
      if (startDate) filter.recordDate.$gte = new Date(startDate);
      if (endDate) filter.recordDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      HealthRecord.find(filter)
        .populate("createdBy", "name role")
        .populate("hospital", "name")
        .populate("appointment", "scheduledAt type")
        .sort({ recordDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      HealthRecord.countDocuments(filter),
    ]);

    return sendPaginated(res, records, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const getRecordById = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id)
      .populate("createdBy", "name role")
      .populate("patient", "name")
      .populate("hospital", "name address");

    if (!record) return sendError(res, 404, "Record not found");

    const isOwner = record.patient._id.toString() === req.user._id.toString();
    const isShared = record.sharedWith.some((u) => u.toString() === req.user._id.toString());
    const isDoctor = req.user.role === "doctor" && record.createdBy?._id?.toString() === req.user._id.toString();

    if (!isOwner && !isShared && !isDoctor) return sendError(res, 403, "Access denied");

    return sendSuccess(res, 200, "Record retrieved", { record });
  } catch (err) {
    next(err);
  }
};

const createRecord = async (req, res, next) => {
  try {
    const patientId = req.user.role === "patient" ? req.user._id : req.body.patientId;
    if (!patientId) return sendError(res, 400, "patientId is required for doctors");

    const record = await HealthRecord.create({
      ...req.body,
      patient: patientId,
      createdBy: req.user._id,
      recordDate: req.body.recordDate || new Date(),
    });

    return sendSuccess(res, 201, "Health record created", { record });
  } catch (err) {
    next(err);
  }
};

const updateRecord = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return sendError(res, 404, "Record not found");

    const canEdit =
      record.patient.toString() === req.user._id.toString() ||
      record.createdBy?.toString() === req.user._id.toString();

    if (!canEdit) return sendError(res, 403, "Not authorized to update this record");

    const updated = await HealthRecord.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    return sendSuccess(res, 200, "Record updated", { record: updated });
  } catch (err) {
    next(err);
  }
};

const deleteRecord = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return sendError(res, 404, "Record not found");

    if (record.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only the patient can delete their records");
    }

    await record.deleteOne();
    return sendSuccess(res, 200, "Record deleted");
  } catch (err) {
    next(err);
  }
};

const shareRecord = async (req, res, next) => {
  try {
    const { doctorIds, share = true } = req.body;
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return sendError(res, 404, "Record not found");

    if (record.patient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only the patient can share their records");
    }

    if (share) {
      const newIds = doctorIds.filter((id) => !record.sharedWith.includes(id));
      record.sharedWith.push(...newIds);
    } else {
      record.sharedWith = record.sharedWith.filter((id) => !doctorIds.includes(id.toString()));
    }

    record.isShared = record.sharedWith.length > 0;
    await record.save();

    return sendSuccess(res, 200, `Record ${share ? "shared" : "unshared"} successfully`, {
      sharedWith: record.sharedWith,
    });
  } catch (err) {
    next(err);
  }
};

const syncOfflineRecords = async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return sendError(res, 400, "Records array is required");
    }

    const results = await Promise.allSettled(
      records.map((r) =>
        HealthRecord.findOneAndUpdate(
          { _id: r._id, patient: req.user._id },
          { ...r, patient: req.user._id, isOfflineSynced: true, syncedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    const synced = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return sendSuccess(res, 200, `Synced ${synced} records${failed ? `, ${failed} failed` : ""}`, {
      synced,
      failed,
      syncedAt: new Date(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyRecords, getRecordById, createRecord, updateRecord, deleteRecord, shareRecord, syncOfflineRecords };
