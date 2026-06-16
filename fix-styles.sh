#!/bin/bash

echo "Scanning for fake CSS properties in style props..."

FILES=$(grep -rln \
  "uppercase:\|lowercase:\|capitalize:\|italic:\|underline:\|overline:\|absolute:\|relative:\|fixed:\|sticky:\|static:\|hidden:\|block:\|inline:\|flex:\|grid:\|pointer:\|truncate:\|srOnly:\|animate:\|transition:\|rounded:\|shadow:\|border:\|leading:\|tracking:\|font:\|text:" \
  apps/web/src --include="*.tsx" --include="*.ts")

if [ -z "$FILES" ]; then
  echo "No fake CSS properties found."
else
  echo "Files with potential fake CSS properties:"
  echo "$FILES"
fi

echo ""
echo "Running targeted property searches..."

echo "--- uppercase ---"
grep -rn "uppercase:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- lowercase ---"
grep -rn "lowercase:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- capitalize ---"
grep -rn "capitalize:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- italic ---"
grep -rn "[^a-zA-Z]italic:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- underline ---"
grep -rn "underline:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- absolute ---"
grep -rn "[^a-zA-Z]absolute:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- relative ---"
grep -rn "[^a-zA-Z]relative:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- hidden ---"
grep -rn "[^a-zA-Z]hidden:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- block ---"
grep -rn "[^a-zA-Z]block:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- fixed ---"
grep -rn "[^a-zA-Z]fixed:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- sticky ---"
grep -rn "[^a-zA-Z]sticky:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- leading variants ---"
grep -rn "leadingRelaxed:\|leadingNone:\|leadingTight:\|leadingSnug:\|leadingNormal:\|leadingLoose:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- tracking variants ---"
grep -rn "trackingTight:\|trackingWide:\|trackingWidest:\|trackingNormal:\|trackingLoose:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- font variants ---"
grep -rn "fontBold:\|fontSemibold:\|fontMedium:\|fontLight:\|fontNormal:\|fontBlack:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- justify variants ---"
grep -rn "justifyText:\|justifyStart:\|justifyEnd:\|justifyCenter:\|justifyBetween:\|justifyAround:\|justifyEvenly:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- items variants ---"
grep -rn "itemsCenter:\|itemsStart:\|itemsEnd:\|itemsStretch:\|itemsBaseline:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- rounded variants ---"
grep -rn "roundedFull:\|roundedLg:\|roundedMd:\|roundedSm:\|roundedXl:\|roundedNone:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- shadow variants ---"
grep -rn "shadowSm:\|shadowMd:\|shadowLg:\|shadowXl:\|shadowNone:\|shadowInner:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- overflow variants ---"
grep -rn "overflowHidden:\|overflowAuto:\|overflowScroll:\|overflowVisible:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- truncate ---"
grep -rn "[^a-zA-Z]truncate:" apps/web/src --include="*.tsx" --include="*.ts"

echo "--- pointer ---"
grep -rn "[^a-zA-Z]pointer:" apps/web/src --include="*.tsx" --include="*.ts"

echo "Done."
