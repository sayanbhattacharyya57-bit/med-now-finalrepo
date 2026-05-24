const Medicine = require("../models/Medicine");
const Hospital = require("../models/Hospital");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { createNotification } = require("../services/notificationService");

const getMedicines = async (req, res, next) => {
  try {
    const { hospitalId, category, search, available, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (hospitalId) filter.hospital = hospitalId;
    if (category) filter.category = category;
    if (available === "true") filter.isAvailable = true;
    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [medicines, total] = await Promise.all([
      Medicine.find(filter)
        .populate("hospital", "name address.city")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ name: 1 }),
      Medicine.countDocuments(filter),
    ]);

    return sendPaginated(res, medicines, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id).populate("hospital", "name address phone");
    if (!medicine) return sendError(res, 404, "Medicine not found");
    return sendSuccess(res, 200, "Medicine retrieved", { medicine });
  } catch (err) {
    next(err);
  }
};

const addMedicine = async (req, res, next) => {
  try {
    const { hospitalId } = req.body;
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return sendError(res, 404, "Hospital not found");

    const medicine = await Medicine.create({ ...req.body, hospital: hospitalId, lastUpdatedBy: req.user._id });
    return sendSuccess(res, 201, "Medicine added", { medicine });
  } catch (err) {
    next(err);
  }
};

const updateMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!medicine) return sendError(res, 404, "Medicine not found");
    return sendSuccess(res, 200, "Medicine updated", { medicine });
  } catch (err) {
    next(err);
  }
};

const updateStock = async (req, res, next) => {
  try {
    const { quantity, expiryDate, batchNumber } = req.body;
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return sendError(res, 404, "Medicine not found");

    medicine.stock.quantity = quantity;
    if (expiryDate) medicine.stock.expiryDate = expiryDate;
    if (batchNumber) medicine.stock.batchNumber = batchNumber;
    medicine.isAvailable = quantity > 0;
    medicine.lastUpdatedBy = req.user._id;
    await medicine.save();

    // Alert if below threshold
    if (quantity <= medicine.stock.minThreshold) {
      const hospital = await Hospital.findById(medicine.hospital).select("admins name");
      await Promise.allSettled(
        (hospital?.admins || []).map((adminId) =>
          createNotification({
            recipient: adminId,
            type: "medicine_update",
            title: "⚠️ Low Medicine Stock",
            message: `${medicine.name} stock is critically low (${quantity} remaining) at ${hospital.name}`,
            data: { medicineId: medicine._id, quantity },
            priority: "high",
          })
        )
      );
    }

    return sendSuccess(res, 200, "Stock updated", { medicine });
  } catch (err) {
    next(err);
  }
};

const deleteMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!medicine) return sendError(res, 404, "Medicine not found");
    return sendSuccess(res, 200, "Medicine removed");
  } catch (err) {
    next(err);
  }
};

const getLowStockAlerts = async (req, res, next) => {
  try {
    const { hospitalId } = req.query;
    const filter = { isActive: true };
    if (hospitalId) filter.hospital = hospitalId;

    const medicines = await Medicine.find({
      ...filter,
      $expr: { $lte: ["$stock.quantity", "$stock.minThreshold"] },
    }).populate("hospital", "name");

    return sendSuccess(res, 200, "Low stock medicines", { medicines, count: medicines.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMedicines, getMedicineById, addMedicine, updateMedicine, updateStock, deleteMedicine, getLowStockAlerts };
