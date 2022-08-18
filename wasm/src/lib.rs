mod utils;

use image::{imageops, ImageBuffer, RgbaImage};
use img_hash::{FilterType, HasherConfig};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn phash(rgba: Vec<u8>, width: u32, height: u32, hash_size: Option<u32>) -> String {
    return phash_inner(rgba, width, height, hash_size.unwrap_or(16));
}

fn phash_inner(rgba: Vec<u8>, width: u32, height: u32, hash_size: u32) -> String {
    let image: RgbaImage = ImageBuffer::from_raw(width, height, rgba).unwrap();

    let hasher = HasherConfig::new()
        .hash_size(hash_size, hash_size)
        .resize_filter(FilterType::Lanczos3)
        .preproc_dct()
        .to_hasher();

    let hash = hasher.hash_image(&image);

    return hex::encode(hash.as_bytes());
}

#[wasm_bindgen]
pub fn resize(rgba: Vec<u8>, width: u32, height: u32, new_width: u32, new_height: u32) -> Vec<u8> {
    return resize_inner(rgba, width, height, new_width, new_height);
}

fn resize_inner(
    rgba: Vec<u8>,
    width: u32,
    height: u32,
    new_width: u32,
    new_height: u32,
) -> Vec<u8> {
    let image: RgbaImage = ImageBuffer::from_raw(width, height, rgba).unwrap();

    let resized = imageops::resize(&image, new_width, new_height, FilterType::Lanczos3);

    return resized.into_raw();
}
