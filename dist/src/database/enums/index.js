"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = exports.PaymentStatus = exports.BookingStatus = exports.ServiceType = exports.Role = void 0;
var Role;
(function (Role) {
    Role["SUPERADMIN"] = "SUPERADMIN";
    Role["CLIENT"] = "CLIENT";
})(Role || (exports.Role = Role = {}));
var ServiceType;
(function (ServiceType) {
    ServiceType["AUDIO"] = "AUDIO";
    ServiceType["VIDEO"] = "VIDEO";
    ServiceType["PODCAST"] = "PODCAST";
    ServiceType["LIVESTREAM"] = "LIVESTREAM";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "PENDING";
    BookingStatus["CONFIRMED"] = "CONFIRMED";
    BookingStatus["COMPLETED"] = "COMPLETED";
    BookingStatus["CANCELLED"] = "CANCELLED";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["MOBILE_MONEY"] = "MOBILE_MONEY";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
//# sourceMappingURL=index.js.map