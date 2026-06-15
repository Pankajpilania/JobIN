import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationDto } from './create-application.dto';

/** All fields from CreateApplicationDto become optional for PATCH */
export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}
