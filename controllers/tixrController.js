import bcryptjs from "bcryptjs";
import { getOrders, getPhoneNumber } from "../services/tixrServices";

export function getOrders(req, res, next) {
  const data = req.params.id 
 getOrders({ data }, (error, result) => {
  if (error) {
    return next(error);
  }
  return res.status(200).send({
    message: "Success",
    result,
  });
});   
}

export function getPhoneNumber(req, res, next) {
  const data = req.params.id 
 getPhoneNumber({ data }, (error, result) => {
  if (error) {
    return next(error);
  }
  return res.status(200).send({
    message: "Success",
    result,
  });
});   
}
