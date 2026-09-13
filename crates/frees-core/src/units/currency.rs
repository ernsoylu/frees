//! Currency as an eighth base dimension, with runtime-refreshable rates.
//!
//! Money is dimensionally its own thing: `USD` is the base "SI" unit of the
//! dimension, every other currency is a unit of it whose factor is the USD it
//! buys. That makes `[TRY]` convert to `[EUR]` through exactly the same path as
//! `[kPa]` to `[psi]`, and keeps `x [USD] + y [kg]` an error.
//!
//! Rates are not physical constants, so the table below is only a dated
//! fallback for an offline run; the browser installs live rates fetched from a
//! free exchange-rate feed through [`install_rates_json`]. A document that
//! mixes currencies is therefore reproducible only against a recorded rate set.

use crate::units::quantity::{Dims, DIMENSIONS};
use std::collections::BTreeMap;
use std::sync::RwLock;

/// Dimension vector of money: one in the currency slot (the last base
/// dimension, `USD`).
pub const CURRENCY: Dims = {
    let mut d = [0.0; DIMENSIONS];
    d[DIMENSIONS - 1] = 1.0;
    d
};

/// USD bought by one unit of each currency — a dated offline fallback
/// (mid-2026 magnitudes, not a quotation). Live rates replace it.
pub static FALLBACK_RATES: &[(&str, f64)] = &[
    ("USD", 1.0),
    ("EUR", 1.08),
    ("GBP", 1.27),
    ("CHF", 1.12),
    ("JPY", 0.0067),
    ("TRY", 0.029),
    ("RUB", 0.011),
    ("CNY", 0.14),
    ("CAD", 0.73),
    ("AUD", 0.66),
    ("NZD", 0.60),
    ("SEK", 0.095),
    ("NOK", 0.093),
    ("DKK", 0.145),
    ("PLN", 0.25),
    ("CZK", 0.043),
    ("HUF", 0.0028),
    ("RON", 0.22),
    ("BGN", 0.55),
    ("ISK", 0.0072),
    ("INR", 0.012),
    ("BRL", 0.18),
    ("MXN", 0.055),
    ("ZAR", 0.055),
    ("KRW", 0.00073),
    ("SGD", 0.74),
    ("HKD", 0.128),
    ("TWD", 0.031),
    ("THB", 0.028),
    ("MYR", 0.22),
    ("IDR", 0.000062),
    ("PHP", 0.017),
    ("VND", 0.00004),
    ("AED", 0.272),
    ("SAR", 0.267),
    ("QAR", 0.275),
    ("KWD", 3.25),
    ("BHD", 2.65),
    ("OMR", 2.60),
    ("JOD", 1.41),
    ("ILS", 0.27),
    ("EGP", 0.021),
    ("MAD", 0.10),
    ("NGN", 0.00065),
    ("UAH", 0.024),
    ("PKR", 0.0036),
    ("BDT", 0.0084),
    ("ARS", 0.001),
    ("CLP", 0.001),
    ("COP", 0.00024),
    ("PEN", 0.27),
];

/// Live rates, USD per unit, once a feed has been installed.
static LIVE_RATES: RwLock<Option<BTreeMap<String, f64>>> = RwLock::new(None);

/// USD bought by one unit of `code`, live rates first. Codes are matched
/// case-insensitively, like every other unit name.
pub fn usd_per(code: &str) -> Option<f64> {
    if code.len() != 3 || !code.bytes().all(|b| b.is_ascii_alphabetic()) {
        return None;
    }
    let upper = code.to_ascii_uppercase();
    if let Ok(guard) = LIVE_RATES.read() {
        if let Some(rate) = guard.as_ref().and_then(|m| m.get(&upper)) {
            return Some(*rate);
        }
    }
    FALLBACK_RATES
        .iter()
        .find(|(c, _)| *c == upper)
        .map(|(_, rate)| *rate)
}

/// Every currency code that resolves right now, for the unit catalog.
pub fn known_codes() -> Vec<String> {
    let mut codes: BTreeMap<String, ()> = FALLBACK_RATES
        .iter()
        .map(|(c, _)| ((*c).to_string(), ()))
        .collect();
    if let Ok(guard) = LIVE_RATES.read() {
        if let Some(live) = guard.as_ref() {
            codes.extend(live.keys().map(|c| (c.clone(), ())));
        }
    }
    codes.into_keys().collect()
}

/// Install a USD-based exchange-rate feed. Accepts what the free endpoints
/// return — `{"base":"USD","rates":{"EUR":0.92,…}}`, values in currency units
/// per USD — or a bare `{"EUR":0.92,…}` map. Returns how many rates landed.
///
/// The payload is a flat table of `"CODE": number` pairs, so it is scanned
/// directly rather than pulling a JSON parser into the engine: every key that
/// is not a three-letter code with a positive numeric value is skipped, which
/// drops the feeds' `base`, `date` and timestamp fields on the way past.
pub fn install_rates_json(json: &str) -> Result<usize, String> {
    if let Some(base) = string_field(json, "base").or_else(|| string_field(json, "base_code")) {
        if !base.eq_ignore_ascii_case("USD") {
            return Err(format!(
                "exchange rates must be quoted against USD, got {base}"
            ));
        }
    }
    let mut table = BTreeMap::new();
    table.insert("USD".to_string(), 1.0);
    for (code, per_usd) in numeric_fields(json) {
        if code.len() == 3
            && code.bytes().all(|b| b.is_ascii_alphabetic())
            && per_usd.is_finite()
            && per_usd > 0.0
        {
            table.insert(code.to_ascii_uppercase(), 1.0 / per_usd);
        }
    }
    if table.len() == 1 {
        return Err("exchange-rate feed carried no usable rates".to_string());
    }
    let count = table.len();
    *LIVE_RATES
        .write()
        .map_err(|_| "exchange-rate table is poisoned".to_string())? = Some(table);
    Ok(count)
}

/// `"name": "value"` — the first string value of `name`, if the feed has one.
fn string_field<'a>(json: &'a str, name: &str) -> Option<&'a str> {
    let rest = json.split_once(&format!("\"{name}\""))?.1;
    let rest = rest.trim_start().strip_prefix(':')?.trim_start();
    let rest = rest.strip_prefix('"')?;
    rest.split_once('"').map(|(value, _)| value)
}

/// Every `"key": number` pair in the document, at any nesting depth.
fn numeric_fields(json: &str) -> Vec<(&str, f64)> {
    let mut out = Vec::new();
    let bytes = json.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] != b'"' {
            i += 1;
            continue;
        }
        let key_start = i + 1;
        let Some(len) = bytes[key_start..].iter().position(|b| *b == b'"') else {
            break;
        };
        let key = &json[key_start..key_start + len];
        i = key_start + len + 1;
        let Some(after_colon) = json[i..].trim_start().strip_prefix(':') else {
            continue;
        };
        let value = after_colon.trim_start();
        let end = value
            .find(|c: char| !(c.is_ascii_digit() || c == '.' || c == '-' || c == 'e' || c == 'E'))
            .unwrap_or(value.len());
        if let Ok(number) = value[..end].parse::<f64>() {
            out.push((key, number));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fallback_rates_resolve_and_live_rates_win() {
        assert_eq!(usd_per("usd"), Some(1.0));
        assert!(usd_per("TRY").is_some());
        assert_eq!(usd_per("kg"), None);
        assert_eq!(usd_per("NOTACODE"), None);

        let n = install_rates_json(r#"{"base":"USD","rates":{"EUR":0.5,"XYZ":"bad"}}"#).unwrap();
        assert_eq!(n, 2); // USD + EUR; the malformed entry is skipped
        assert_eq!(usd_per("EUR"), Some(2.0));
        // Codes the feed omits fall back to the baked table.
        assert_eq!(usd_per("GBP"), Some(1.27));
        assert!(install_rates_json(r#"{"base":"EUR","rates":{}}"#).is_err());

        // The registry treats money like any other unit family.
        use crate::units::UnitRegistry;
        assert_eq!(UnitRegistry::convert("EUR", "USD").unwrap(), 2.0);
        assert!(UnitRegistry::convert("USD", "kg").is_err());
        assert_eq!(
            UnitRegistry::parse("USD/kg").unwrap().dims[DIMENSIONS - 1],
            1.0
        );
    }
}
