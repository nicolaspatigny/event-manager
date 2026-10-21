package com.eventmanager.backend.exception;

import java.util.Map;
import java.util.TreeMap;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ApiException.class)
  ProblemDetail business(ApiException e) {
    return ProblemDetail.forStatusAndDetail(e.status, e.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ProblemDetail validation(MethodArgumentNotValidException e) {
    ProblemDetail p =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST, "Vérifiez les champs du formulaire");
    Map<String, String> errors = new TreeMap<>();
    e.getBindingResult()
        .getFieldErrors()
        .forEach(f -> errors.putIfAbsent(f.getField(), f.getDefaultMessage()));
    p.setProperty("errors", errors);
    return p;
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class
  })
  ProblemDetail malformed(Exception e) {
    return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Requête invalide");
  }

  @ExceptionHandler(DuplicateKeyException.class)
  ProblemDetail duplicate(DuplicateKeyException e) {
    return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Cette valeur existe déjà");
  }
}
