package com.stoyandev.caloriecalculator.security.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.UserDetails;

import java.security.Key;
import java.util.Date;
import java.util.function.Function;


public class JwtService {

    private static final Key SECRET_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);

    public static String extractUsername(final String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public static <T> T extractClaim(final String token, final Function<Claims, T> claimResolver) {
        final Claims claims = extractAllClaims(token);
        return claimResolver.apply(claims);
    }

    public static String generateToken(final UserDetails userDetails) {
        return Jwts.builder()
                .setSubject(userDetails
                        .getUsername())
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 48))
                .signWith(SECRET_KEY)
                .compact();
    }

    public static boolean isTokenValid(final String token, final UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);

    }

    private static boolean isTokenExpired(final String token) {
        return extractExpiration(token).before(new Date());
    }

    private static Date extractExpiration(final String token) {
        return extractClaim(token, Claims::getExpiration);

    }

    private static Claims extractAllClaims(final String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }


}
