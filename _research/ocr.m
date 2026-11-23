// OCR a PNG with the macOS Vision framework (Objective-C, clang).
// Usage: ocr <image.png> [--lines]
#import <Foundation/Foundation.h>
#import <Vision/Vision.h>
#import <AppKit/AppKit.h>

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc < 2) { fprintf(stderr, "usage: ocr <image> [--lines]\n"); return 2; }
        NSString *path = [NSString stringWithUTF8String:argv[1]];
        BOOL wantBoxes = (argc > 2 && strcmp(argv[2], "--lines") == 0);

        NSImage *img = [[NSImage alloc] initWithContentsOfFile:path];
        if (!img) { fprintf(stderr, "cannot read %s\n", argv[1]); return 1; }
        CGImageRef cg = [img CGImageForProposedRect:NULL context:nil hints:nil];
        if (!cg) { fprintf(stderr, "no cgimage\n"); return 1; }

        VNRecognizeTextRequest *req = [VNRecognizeTextRequest new];
        req.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
        req.usesLanguageCorrection = YES;
        req.recognitionLanguages = @[@"en-US"];

        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cg options:@{}];
        NSError *err = nil;
        if (![handler performRequests:@[req] error:&err]) {
            fprintf(stderr, "vision error: %s\n", err.description.UTF8String);
            return 1;
        }
        for (VNRecognizedTextObservation *obs in req.results) {
            VNRecognizedText *best = [obs topCandidates:1].firstObject;
            if (!best) continue;
            NSString *text = [best.string stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
            if (text.length == 0) continue;
            if (wantBoxes) {
                CGRect b = obs.boundingBox;
                printf("%.4f\t%.4f\t%.4f\t%.4f\t%s\n", b.origin.x, b.origin.y, b.size.width, b.size.height, text.UTF8String);
            } else {
                printf("%s\n", text.UTF8String);
            }
        }
    }
    return 0;
}
