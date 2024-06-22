package com.stoyandev.caloriecalculator.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    //todo probably add more if feasible
}